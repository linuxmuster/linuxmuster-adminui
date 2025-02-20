"""
Authentication classes to communicate with LDAP tree and load user's informations.
"""

import os
import pexpect
import re
import ldap
import ldap.filter
import subprocess
import pwd
import grp
import simplejson as json
import logging

from jadi import component, service
from aj.auth import AuthenticationProvider, OSAuthenticationProvider, AuthenticationService
from aj.plugins.lmn_common.api import ldap_config as params, lmsetup_schoolname, pwreset_config, allowed_roles
from aj.plugins.lmn_common.multischool import SchoolManager
from aj.api.endpoint import EndpointError
from linuxmusterTools.ldapconnector import LMNLdapReader, UserWriter


@component(AuthenticationProvider)
class LMAuthenticationProvider(AuthenticationProvider):
    """
    LDAP Authentication provider for linuxmuster.net
    """

    id = 'lm'
    name = _('Linux Muster LDAP') # skipcq: PYL-E0602
    pw_reset = pwreset_config.get('activate', False)

    def __init__(self, context):
        self.context = context
        self.lr = LMNLdapReader

    def get_ldap_user(self, username, attributes=[]):
        """
        Get the user's informations to initialize his session.

        :param username: Username
        :type username: string
        :param context: 'auth' to get permissions and 'userconfig' to get user's personal config, e.g. for Dashboard
        :type context: string
        :return: Dict of values
        :rtype: dict
        """


        return self.lr.get(f'/users/{username}', attributes=attributes)

    def prepare_environment(self, username):
        """
        Perform some objects initialization (multischool environment, kerberos
        ticket) before switching to worker.

        :param username: sAMAccountName
        :type username: string
        """

        # Initialize school manager
        if username in ["root", None]:
            active_school = "default-school"
        else:
            profil = self.get_ldap_user(username)
            # Test purpose for multischool
            if profil['sophomorixSchoolname'] == 'global':
                active_school = "default-school"
            else:
                active_school = profil['sophomorixSchoolname']

        #active_school = self.get_profile(username)['activeSchool']

        try:
            schoolmgr = SchoolManager()
            schoolmgr.switch(active_school)
            self.context.schoolmgr = schoolmgr
            self.context.ldapreader = LMNLdapReader
            self.context.userwriter = UserWriter

            def schoolget(*args, **kwargs):
                """
                This alias allow to automatically pass the school context for school
                specific requests.
                """

                result = self.context.ldapreader.get(*args,**kwargs, school=self.context.schoolmgr.school)
                return result

            self.context.ldapreader.schoolget = schoolget

            # Permissions for kerberos ticket
            uid = self.get_isolation_uid(username)

            if os.path.isfile(f'/tmp/krb5cc_{uid}{uid}'):
                if os.path.isfile(f'/tmp/krb5cc_{uid}'):
                    os.unlink(f'/tmp/krb5cc_{uid}')

                os.rename(f'/tmp/krb5cc_{uid}{uid}', f'/tmp/krb5cc_{uid}')
                logging.warning(f"Changing kerberos ticket rights for {username}")
                os.chown(f'/tmp/krb5cc_{uid}', uid, 100)
        except Exception as e:
            logging.warning(str(e))

    def _get_krb_ticket(self, username, password):
        """
        Get a new Kerberos ticket for username stored in /tmp/krb5cc_UIDUID
        This ticket will later be renamed as /tmp/krb5cc_UID.
        The reason is that this function is running as user nobody and cannot
        overwrite an existing ticket.

        :param username: Username
        :type username: string
        :param password: Password
        :type password: string
        """

        uid = self.get_isolation_uid(username)

        if uid == 0 and username == 'root':
            # No ticket for root user
            return

        krb_cache = f'/tmp/krb5cc_{uid}{uid}'

        try:
            subprocess.check_call(["klist", "-s", f'/tmp/krb5cc_{uid}'])
            return
        except subprocess.CalledProcessError as e:
            # Kerberos ticket not available, continuing
            pass

        try:
            logging.warning(f'Initializing Kerberos ticket for {username}')
            child = pexpect.spawn('/usr/bin/kinit', ['-c', krb_cache, username])
            child.expect('.*:', timeout=2)
            child.sendline(password)
            child.expect(pexpect.EOF)
            child.close()
            exit_code = child.exitstatus
            if exit_code:
                logging.error(f"Was not able to initialize Kerberos ticket for {username}")
                logging.error(f"{child.before.decode().strip()}")
        except pexpect.exceptions.TIMEOUT:
            logging.error(
                f"Was not able to initialize Kerberos ticket for {username}")

    def _check_password(self, username, password, dn=''):
        """
        Check username's password against LDAP server

        :param username: Username
        :type username: string
        :param password: Password
        :type password: string
        :param dn: User's DN
        :type dn: string
        :return: User's permissions
        :rtype: bool
        """

        if not dn:
            dn = self.get_ldap_user(username, attributes=['dn'])

        # Is the password right ?
        try:
            l = ldap.initialize('ldap://' + params['host'])
            l.set_option(ldap.OPT_REFERRALS, 0)
            l.protocol_version = ldap.VERSION3
            l.bind_s(dn, password)
            return True
        except Exception as e:
            logging.error(str(e))
            return False

    def authenticate(self, username, password):
        """
        Test credentials against LDAP and parse permissions for the session.

        :param username: Username
        :type username: string
        :param password: Password
        :type password: string
        :return: User's permissions
        :rtype: dict
        """

        if username == 'root':
            return OSAuthenticationProvider.get(self.context).authenticate(username, password)

        username = username.lower()

        # Does the user exist in LDAP ?
        try:
            attributes = ['dn', 'sophomorixWebuiPermissionsCalculated', 'permissions', 'sophomorixRole']
            userAttrs = self.get_ldap_user(username, attributes=attributes)

            #if 'administrator' not in userAttrs.get('sophomorixRole', ''):
                #return False

            if not userAttrs or not userAttrs.get('dn', ''):
                return False

            if userAttrs.get('sophomorixRole', '') not in allowed_roles:
                return False

        except KeyError as e:
            return False

        if not self._check_password(username, password, dn=userAttrs['dn']):
            return False

        self._get_krb_ticket(username, password)

        return {
            'username': username,
            'password': password,
            'permissions': userAttrs['permissions'],
            }

    def authorize(self, username, permission):
        """
        Get permissions from session, default false.

        :param username: Username
        :type username: string
        :param permission: Permission as dict
        :type permission: dict
        :return: Bool
        :rtype: bool
        """

        if username == 'root':
            return True

        if not username:
            return False

        ## When 2FA is activated, auth_info is missing in prepare_session
        ## Must be fixed in Ajenti
        auth_info = getattr(self.context.session, 'auth_info', None)
        if auth_info is None:
            permissions = {}
            adminuiPermissions = self.lr.get(f'/users/{username}').get('sophomorixAdminuiPermissionsCalculated', [])
            for perm in adminuiPermissions:
                module, value = perm.split(': ')
                try:
                    permissions[module] = value == 'true'
                except Exception as e:
                    logging.error(str(e))
                    raise Exception('Bad value in LDAP field SophomorixUserPermissions! Python error:\n' + str(e))

            # Populating session.auth_info for further use
            self.context.session.auth_info = {
                'username': username,
                'permissions':  permissions
            }

        return self.context.session.auth_info['permissions'].get(permission['id'], False)

    def change_password(self, username, password, new_password):
        """
        Change user password through sophomorix-passwd.

        :param username: Username
        :type username: string
        :param password: Old password
        :type password: string
        :param new_password: New password
        :type new_password: string
        """

        if not self.authenticate(username, password):
            raise Exception('Wrong password')
        systemString = ['sudo', 'sophomorix-passwd', '--user', username, '--pass', new_password, '--hide', '--nofirstpassupdate', '--use-smbpasswd']
        subprocess.check_call(systemString, shell=False, sensitive=True)

    def get_isolation_gid(self, username):
        """
        For each session there will be an isolated worker. This function returns
        the right gid for the worker process.

        :param username: Username
        :type username: string
        :return: GID of the user
        :rtype: integer
        """

        if username == 'root':
            return 0
        # GROUP CONTEXT
        try:
            groupmembership = ''.join(self.get_ldap_user(username).get('memberOf', []))
        except Exception:
            groupmembership = ''
        if 'role-globaladministrator' in groupmembership or 'role-schooladministrator' in groupmembership:
            return None

        roles = ['role-teacher', 'role-student']
        for role in roles:
            if role in groupmembership:
                try:
                    gid = grp.getgrnam(role).gr_gid
                    logging.debug(f"Running Adminui as {role}")
                except KeyError:
                    gid = grp.getgrnam('nogroup').gr_gid
                    logging.debug(f"Context group not found, running Adminui as {nogroup}")
                return gid
        return None

    def get_isolation_uid(self, username):
        """
        For each session there will be an isolated worker. This function returns
        the right uid for the worker process.

        :param username: Username
        :type username: string
        :return: UID of the user
        :rtype: integer
        """

        if username == 'root':
            return 0
        # USER CONTEXT
        try:
            groupmembership = ''.join(self.get_ldap_user(username).get('memberOf', []))
        except Exception as e:
            logging.error(e)
            groupmembership = ''

        if 'role-globaladministrator' in groupmembership or 'role-schooladministrator' in groupmembership:
            return 0

        try:
            uid = pwd.getpwnam(username).pw_uid
            logging.debug(f"Running Adminui as {username}")
        except KeyError:
            uid = pwd.getpwnam('nobody').pw_uid
            logging.debug(f"Context user not found, running Adminui as {nobody}")

        return uid

    def get_profile(self, username):
        """
        Prepare identity profile for angular.

        :param username: Username
        :type username: string
        :return: User's informations from LDAP
        :rtype: dict
        """

        if username in ["root",None]:
            return {'activeSchool': 'default-school', 'school_show': True, 'schoolname': "Default School"}
        try:
            profil = self.get_ldap_user(username)
            
            if profil['sophomorixSchoolname'] == 'global':
                profil['activeSchool'] = "default-school"
            else:
                if self.context.schoolmgr.school:
                    profil['activeSchool'] = self.context.schoolmgr.school
                else:
                    profil['activeSchool'] = profil['sophomorixSchoolname']

            if self.context.schoolmgr.schools and len(self.context.schoolmgr.schools) > 1 and "role-globaladministrator" in ''.join(profil.get('memberOf', [])):
                profil['school_show'] = True
            else:
                profil['school_show'] = False
            
            if self.context.schoolmgr.schoolname:
                profil['schoolname'] = self.context.schoolmgr.schoolname
            else:
                profil['schoolname'] = lmsetup_schoolname

            return json.loads(json.dumps(profil))
        except Exception as e:
            logging.error(e)
            return {}

    def check_mail(self, mail):
        """
        Check if a given mail actually exists in the LDAP tree, in order to send
        or not a password reset email.
        The tested field must be given in the config file.

        :param mail: Email of the user
        :type mail: basestring
        :return: Existing or not
        :rtype: bool
        """

        ldap_filter = f"""(&
                            (objectClass=user)
                            (|
                                (sophomorixRole=globaladministrator)
                                (sophomorixRole=schooladministrator)
                                (sophomorixRole=teacher)
                                (sophomorixRole=student)
                            )
                            ({pwreset_config['ldap_mail_field']}=%s)
                        )"""

        # Apply escape chars on mail value
        searchFilter = ldap.filter.filter_format(ldap_filter, [mail])

        l = ldap.initialize('ldap://' + params['host'])
        # Binduser bind to the  server
        try:
            l.set_option(ldap.OPT_REFERRALS, 0)
            l.protocol_version = ldap.VERSION3
            l.bind_s(params['binddn'], params['bindpw'])
        except Exception as e:
            logging.error(str(e))
            raise KeyError(e)
        try:
            res = l.search_s(params['searchdn'], ldap.SCOPE_SUBTREE, searchFilter, attrlist=['sAMAccountName'])
            if res[0][0] is None:
                # Don't show any hint if the email doesn't exists in ldap
                return False
            # What to do if email is not unique ?
            return res[0][1]['sAMAccountName'][0].decode()
        except (ldap.LDAPError, KeyError):
            return False

        l.unbind_s()
        return False

    def check_password_complexity(self, password):
        """
        Check if a given password for a user for the password reset function
        respects some standards.
        """

        strong_pw = re.match('(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()\+{}\-\[\]]|(?=.*\d)).{7,}', password)
        valid_pw = re.match('^[a-zA-Z0-9!@#§+\-$%&*{}()\]\[]+$', password)
        if valid_pw and strong_pw:
            return True
        raise EndpointError(_(
            f'Minimal length is 7 characters. Use upper, lower and special characters or numbers. (e.g. Muster!).' 
            f'Valid characters are: a-z A-Z 0-9 !§+-@#$%&amp;*( )[ ]{{ }}'))

    def update_password(self, username, password):
        systemString = ['sudo', 'sophomorix-passwd', '--user', username, '--pass', password, '--hide', '--nofirstpassupdate', '--use-smbpasswd']
        subprocess.check_call(systemString, shell=False, sensitive=True)
        return True

    def signout(self):
        """
        Perform some cleaning while destroying the session (removing the
        kerberos ticket).
        """

        uid = self.get_isolation_uid(self.context.identity)

        if uid == 0 and self.context.identity == 'root':
            # No ticket for root user
            return
        # Remove Kerberos ticket
        subprocess.check_output(['/usr/bin/kdestroy', '-c', f'/tmp/krb5cc_{uid}'])

