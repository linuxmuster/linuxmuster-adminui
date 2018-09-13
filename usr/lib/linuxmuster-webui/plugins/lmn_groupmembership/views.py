# coding=utf-8
from jadi import component
from aj.api.http import url, HttpPlugin
from aj.api.endpoint import endpoint
from aj.auth import authorize
from aj.plugins.lm_common.api import lmn_getSophomorixValue
import subprocess


@component(HttpPlugin)
class Handler(HttpPlugin):
    def __init__(self, context):
        self.context = context

    @url(r'/api/lmn/groupmembership')
    @authorize('lmn:groupmembership')
    @endpoint(api=True)
    def handle_api_settings(self, http_context):
        schoolname = 'default-school'
        username = http_context.json_body()['username']
        action = http_context.json_body()['action']

        if http_context.method == 'POST':
            if action == 'list-groups':
                membershipList = []

                # get all available groups
                sophomorixCommand = ['sophomorix-query',  '--schoolbase', schoolname, '--user-full', '-j', '--sam', username]
                groups = lmn_getSophomorixValue(sophomorixCommand, 'USER/'+username+'/memberOf')
                usergroups = []
                for group in groups:
                    usergroups.append(group.split(',')[0].split('=')[1])

                # get groups specified user is member of
                sophomorixCommand = ['sophomorix-query', '--class', '--schoolbase', schoolname, '--group-full', '-jj']
                schoolclasses = lmn_getSophomorixValue(sophomorixCommand, 'LISTS/GROUP')
                # build membershipList with membership status
                for schoolclass in schoolclasses:
                    if schoolclass in usergroups:
                        membershipList.append({'classname': schoolclass, 'membership': True})
                    else:
                        membershipList.append({'classname': schoolclass, 'membership': False})
                return membershipList

            if action == 'set-groups':
                groups = http_context.json_body()['groups']
                # groupsToAdd = []
                # groupsToRemove = []
                # TODO Batch adding needed
                for group in groups:
                    if group['membership'] is True:
                        # groupsToAdd.append(group)
                        sophomorixCommand = ['sophomorix-group',  '--addmembers', username, '--group', group['classname']]
                        subprocess.check_call(sophomorixCommand, shell=False)
                    if group['membership'] is False:
                        # groupsToRemove.append(group)
                        sophomorixCommand = ['sophomorix-group',  '--removemembers', username, '--group', group['classname']]
                        subprocess.check_call(sophomorixCommand, shell=False)
                return 0
