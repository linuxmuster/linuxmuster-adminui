"""
Module to configure sophomorix.
"""

# coding=utf-8
import os
import subprocess
from jadi import component
import re
from glob import glob
import base64
import json
import time

from aj.api.http import get, post, HttpPlugin
from aj.api.endpoint import endpoint, EndpointError, EndpointReturn
from aj.auth import authorize
from linuxmusterTools.lmnfile import LMNFile


@component(HttpPlugin)
class Handler(HttpPlugin):
    EMAIL_MAPPING = {
        'ä': 'ae',
        'ö': 'oe',
        'ü': 'ue',
        'ß': 'ss',
        '@': '\\@',
    }
    EMAIL_REVERSE_MAPPING = { v:k for (k, v) in EMAIL_MAPPING.items()}

    def __init__(self, context):
        self.context = context


    @post(r'/api/lmn/schoolsettings/determine-encoding')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_session_sessions(self, http_context):
        """
        Determine encoding using sophomorix-check.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Encoding type of the file, e.g. utf-8
        :rtype: string
        """

        fileToCheck = http_context.json_body()['path']
        if os.path.isfile(fileToCheck) is False:
            os.mknod(fileToCheck)
        if os.path.isfile(fileToCheck):
            with LMNFile(fileToCheck, 'r') as f:
                return f.detect_encoding()
        return None

    @get(r'/api/lmn/adminuisettings')
    @authorize('lm:adminuisettings')
    @endpoint(api=True)
    def handle_api_get_adminuisettings(self, http_context):
        """
        Read the adminui config file.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict in read mode
        """


        path = '/etc/linuxmuster/adminui/config.yml'

        with LMNFile(path, 'r') as f:
            config = dict(f.data)
            del config['linuxmuster']['ldap']

        return config

    @get(r'/api/lmn/schoolsettings')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_get_schoolsettings(self, http_context):
        """
        Read the config file `school.conf`.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict in read mode
        """

        path = f'{self.context.schoolmgr.configpath}school.conf'
        # Update each time the config_obj because it may have changed
        with LMNFile(path, 'r') as f:
            self.config_obj = f

        # Just export ConfigObj as dict for angularjs
        return dict(self.config_obj.data)

    @post(r'/api/lmn/schoolsettings')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_write_schoolsettings(self, http_context):
        """
        Write the config file `school.conf`.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict in read mode
        """

        path = f'{self.context.schoolmgr.configpath}school.conf'
        # Update each time the config_obj because it may have changed
        with LMNFile(path, 'r') as f:
            self.config_obj = f

        data = http_context.json_body()
        if 'admins_print' in data:
            for k, v in self.EMAIL_MAPPING.items():
                data['admins_print'] = data['admins_print'].replace(k, v)

        self.config_obj.write(data)

        # Update setup.ini with new schoolname
        with LMNFile('/var/lib/linuxmuster/setup.ini', 'r') as s:
            s.data['setup']['schoolname'] = data['school']['SCHOOL_LONGNAME']
            s.write(s.data)

    def _filter_templates(self, filename, school=''):
        """
        Test if the name respects the sophomorix scheme for latex templates.
        See https://github.com/linuxmuster/sophomorix4/blob/bionic/sophomorix-samba/lang/latex/README.latextemplates.

        :param school: school
        :type school: string
        :param file: name of the file
        :type file: string
        :return: result of the test
        :rtype: dict with groups values
        """

        pattern = re.compile(
            school + r'\.?([^-]*)-([A-Z]+)-(\d+)-template\.tex')
        m = re.match(pattern, filename)
        if m is None:
            return None
        data = m.groups()
        template = {
            'filename': filename,
            'name': data[0],
            'lang': data[1],
            'numberPerPage': int(data[2])
        }
        return template

    @get(r'/api/lmn/schoolsettings/latex-templates')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_latex_template(self, http_context):
        """
        Get list of latex templates for printing with sophomorix.

        :param http_context: HttpContext
        :type http_context: HttpContext
        """

        templates_multiple = []
        templates_individual = []
        sophomorix_default_path = '/usr/share/sophomorix/lang/latex/templates/'

        for path in glob(sophomorix_default_path + "*tex"):
            filename = path.split('/')[-1]
            template = self._filter_templates(filename)
            if template:
                template['path'] = path
                if template['numberPerPage'] > 1:
                    templates_multiple.append(template)
                else:
                    templates_individual.append(template)

        # School defined templates
        school = self.context.schoolmgr.school
        custom_templates_path = f'/etc/linuxmuster/sophomorix/{school}/latex-templates/'
        if os.path.isdir(custom_templates_path):
            for path in glob(custom_templates_path + "*tex"):
                filename = path.split('/')[-1]
                template = self._filter_templates(filename, school)
                if template:
                    template['path'] = os.path.join(custom_templates_path, filename)
                    if template['numberPerPage'] > 1:
                        templates_multiple.append(template)
                    else:
                        templates_individual.append(template)

        return templates_individual, templates_multiple

    @get(r'/api/lmn/subnets')
    @authorize('lm:globalsettings')
    @endpoint(api=True)
    def handle_api_get_subnet(self, http_context):
        """
        Get `subnets.csv` config file for subnets.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict
        """

        path = '/etc/linuxmuster/subnets.csv'

        with LMNFile(path, 'r') as s:
            subnets = list(s.data)
        return subnets

    @post(r'/api/lmn/subnets')
    @authorize('lm:globalsettings')
    @endpoint(api=True)
    def handle_api_write_subnet(self, http_context):
        """
        Write `subnets.csv` config file for subnets.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict
        """

        path = '/etc/linuxmuster/subnets.csv'

        data = http_context.json_body()
        with LMNFile(path, 'w') as f:
            f.write(data)

        try:
            subprocess.check_call('linuxmuster-import-subnets > /tmp/import_devices.log', shell=True)
        except Exception as e:
            raise EndpointError(None, message=str(e))

    @get(r'/api/lmn/config/customfields/(?P<role>.*)')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_read_custom_config(self, http_context, role=''):
        """
        Read adminui yaml config and return the settings for custom fields.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict
        """

        base_display_dict = {
            'teachers': {1: '', 2: '', 3:''},
            'students': {1: '', 2: '', 3: ''},
        }

        def ensure_config_structure(config, number, role=None):
            base_custom_dict = {'show': False, 'editable': False, 'title': ''}
            if number:
                base_role_dict = {
                    str(i+1):base_custom_dict
                    for i in range(number)
                }
            else:
                base_role_dict = base_custom_dict

            base_config_dict = {
                'globaladministrators': {},
                'schooladministrators': {},
                'teachers': {},
                'students': {},
            }

            if role is None:
                for role in base_config_dict:
                    role_dict = config.get(role, {})

                    if role_dict:
                        for i in range(number):
                            idx = str(i+1)
                            role_dict[idx] = role_dict.get(idx, base_custom_dict)
                            for key, value in base_custom_dict.items():
                                role_dict[idx][key] = role_dict[idx].get(key, value)
                        base_config_dict[role] = role_dict
                    else:
                        base_config_dict[role] = base_role_dict
                return base_config_dict
            else:
                role_dict = config.get(role, {})

                if role_dict:
                    for i in range(number):
                        idx = str(i+1)
                        role_dict[idx] = role_dict.get(idx, base_custom_dict)
                        for key, value in base_custom_dict.items():
                            role_dict[idx][key] = role_dict[idx].get(key, value)

                    return role_dict
                return base_role_dict


        school = self.context.schoolmgr.school
        custom_config_path = f'/etc/linuxmuster/sophomorix/{school}/custom_fields.yml'
        custom_config = {}
        if os.path.isfile(custom_config_path):
            with LMNFile(custom_config_path, 'r') as config:
                custom_config = config.read()

        password_templates = custom_config.get('passwordTemplates', {})
        password_templates['multiple'] = password_templates.get('multiple', '')
        password_templates['individual'] = password_templates.get('individual', '')

        config_dict = {
            'custom': ensure_config_structure(custom_config.get('custom', {}), 5),
            'customMulti': ensure_config_structure(custom_config.get('customMulti', {}), 5),
            'customDisplay': custom_config.get('customDisplay', base_display_dict),
            'proxyAddresses': ensure_config_structure(custom_config.get('proxyAddresses', {}), 0),
            'passwordTemplates': password_templates,
        }

        if role:
            role_dict = {
                'custom': ensure_config_structure(config_dict['custom'], 5, role),
                'customMulti': ensure_config_structure(config_dict['customMulti'], 5, role),
                'customDisplay': config_dict['customDisplay'].get(role, {1: '', 2: '', 3:''}),
                'proxyAddresses': ensure_config_structure(config_dict['proxyAddresses'], 0, role),
            }
            return role_dict
        return config_dict


    @post(r'/api/lmn/config/customfields')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_save_custom_config(self, http_context):
        """
        Save customs sophomorix fields settings in the adminui yaml config.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return:
        :rtype:
        """

        custom_config = http_context.json_body()['config']
        school = self.context.schoolmgr.school
        custom_config_path = f'/etc/linuxmuster/sophomorix/{school}/custom_fields.yml'
        with LMNFile(custom_config_path, 'w') as config:
            config.write(custom_config)

    @get(r'/api/lmn/holidays')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_get_holidays(self, http_context):
        """
        Get `holidays.yml` config file for holidays.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict
        """

        school = self.context.schoolmgr.school
        path = f'/etc/linuxmuster/sophomorix/{school}/holidays.yml'

        try:
            with LMNFile(path, 'r') as s:
                return [{
                    'name': name,
                    'start': dates['start'],
                    'end': dates['end'],
                } for name, dates in s.data.items()]
        except AttributeError:
            return []

    @post(r'/api/lmn/holidays')
    @authorize('lm:schoolsettings')
    @endpoint(api=True)
    def handle_api_write_holidays(self, http_context):
        """
        Write `holidays.yml` config file for holidays.

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Settings in read mode
        :rtype: dict
        """

        school = self.context.schoolmgr.school
        path = f'/etc/linuxmuster/sophomorix/{school}/holidays.yml'

        data = http_context.json_body()
        holidays = {holiday['name']: {
            'start': holiday['start'],
            'end': holiday['end']}
            for holiday in data
        }
        with LMNFile(path, 'w') as f:
            f.write(holidays)

    @get(r'/api/lmn/edulution/api-status')
    @endpoint(api=True)
    def handle_api_get_edulution_status(self, http_context):
        """
        Check the status of edulution requirements

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Status of api
        :rtype: dict
        """

        status = {
            "api_installed": False,
            "api_running": False
        }

        if os.path.exists("/etc/linuxmuster/api/config.yml"):
            status['api_installed'] = True

        try:
            if os.system('systemctl is-active --quiet linuxmuster-api') == 0:
                status['api_running'] = True
        except:
            pass

        return status
    
    @post(r'/api/lmn/edulution/generate')
    @endpoint(api=True)
    def handle_api_get_edulution_generate(self, http_context):
        """
        Generate the edulution setup hash

        :param http_context: HttpContext
        :type http_context: HttpContext
        :return: Edulution Setup Hash
        :rtype: str
        """
        
        if os.getuid() != 0:
            return EndpointReturn(403)
        
        external_domain = http_context.json_body()['external_domain']
        binduser_name = http_context.json_body()['binduser_name']
        binduser_dn = http_context.json_body()['binduser_dn']

        secret_path = os.path.join('/etc/linuxmuster/.secret/', binduser_name)

        if not os.path.isfile(secret_path):
            return EndpointReturn(403)
        else:
            with open(secret_path, 'r') as f:
                binduser_password = f.read()

        data = json.dumps({
            "external_domain": external_domain,
            "binduser_name": binduser_name,
            "binduser_dn": binduser_dn,
            "binduser_password": binduser_password,
            "timestamp": time.time()
        })

        return base64.b64encode(data.encode('utf-8'))



