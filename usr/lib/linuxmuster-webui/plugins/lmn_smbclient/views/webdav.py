"""
Tools to handle files, directories and uploads.
"""

import os
import hashlib
from datetime import datetime
import smbclient
from smbprotocol.exceptions import SMBOSError, NotFound, SMBAuthenticationError, InvalidParameter
from spnego.exceptions import BadMechanismError
from jadi import component
import xml.etree.ElementTree as ElementTree

from aj.api.http import url, get, post, mkcol, options, propfind, HttpPlugin
from aj.api.endpoint import endpoint, EndpointError, EndpointReturn
from aj.auth import authorize, AuthenticationService
from aj.plugins.lmn_common.mimetypes import content_mimetypes
from aj.plugins.lmn_smbclient.davxml import xml_propfind_response
from aj.plugins.lmn_common.api import samba_realm


@component(HttpPlugin)
class Handler(HttpPlugin):
    def __init__(self, context):
        self.context = context

    @get(r'/api/lmn/webdav/(?P<path>.*)')
    @endpoint(api=True)
    def handle_api_webdav_get(self, http_context, path=''):
        baseShare = f'\\\\{samba_realm}\\{self.context.schoolmgr.school}\\'
        path = path.replace('/', '\\')
        try:
            with smbclient.open_file(f'{baseShare}{path}', 'rb') as f:
                return f.read()
        except (ValueError, SMBOSError, NotFound) as e:
            http_context.respond_not_found()
            return ''
        except InvalidParameter as e:
            #raise EndpointError(f'Problem with path {path} : {e}')
            http_context.respond_server_error()
            return ''

    @options(r'/api/lmn/webdav/(?P<path>.*)')
    @endpoint(api=True)
    def handle_api_webdav_options(self, http_context, path=''):
        http_context.add_header("Allow", "OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, COPY, MOVE")
        http_context.add_header("Allow", "MKCOL, PROPFIND")
        http_context.add_header("DAV", "1, 3")
        return ''

    @propfind(r'/api/lmn/webdav/(?P<path>.*)')
    @endpoint(api=True)
    def handle_api_webdav_propfind(self, http_context, path=''):
        user = self.context.identity
        print(http_context.body)
        profil = AuthenticationService.get(self.context).get_provider().get_profile(user)
        role = profil['sophomorixRole']
        adminclass = profil['sophomorixAdminClass']
        baseShare = f'\\\\{samba_realm}\\{self.context.schoolmgr.school}\\'

        baseUrl = "/api/lmn/webdav/"

        # READ XML body for requested properties
        if b'<?xml' in http_context.body:
            tree = ElementTree.fromstring(http_context.body)
            requested_properties = {p.tag for p in tree.findall('.//{DAV:}prop/*')}
            requested_properties = {r.replace('{DAV:}', '') for r in requested_properties}
            print(requested_properties)

        items = {}

        if not path:
            # / is asked, must give the list of shares
            shares = self.context.schoolmgr.get_shares(user, role, adminclass)
            for share in shares:
                smb_file = smbclient._os.SMBDirEntry.from_path(share['path'])
                stat = smb_file.stat()
                item_path = share['path'].replace(baseShare, '').replace('\\', '/') # TODO

                raw_etag = f"{smb_file.name}-{stat.st_size}-{stat.st_mtime}".encode()
                etag = hashlib.md5(raw_etag).hexdigest()
                if share['name'] == "Home":
                    item_path = item_path.split('/')[0]

                items[f'{baseUrl}{item_path}/'] = {
                        'isDir': True,
                        'getlastmodified': datetime.fromtimestamp(stat.st_mtime).strftime("%a, %d %b %Y  %H:%M:%S %Z"),
                        'getcontentlength': str(stat.st_size),
                        'getcontenttype': None,
                        'getetag': etag,
                        'displayname': share['name'],

                    }

        else:
            path = path.replace('/', '\\')
            smb_path = f"{baseShare}{path}"

            try:
                for item in smbclient.scandir(smb_path):
                    print(item)
                    item_path = os.path.join(path, item.name).replace('\\', '/') # TODO

                    stat = item.stat()

                    raw_etag = f"{item.name}-{stat.st_size}-{stat.st_mtime}".encode()
                    etag = hashlib.md5(raw_etag).hexdigest()

                    ext = os.path.splitext(item.name)[1]
                    content_type = "application/octet-stream"
                    if ext in content_mimetypes:
                        content_type = content_mimetypes[ext]

                    items[f'{baseUrl}{item_path}'] = {
                        'isDir': item.is_dir(),
                        'getlastmodified': datetime.fromtimestamp(stat.st_mtime).strftime("%a, %d %b %Y  %H:%M:%S %Z"),
                        'getcontentlength': str(stat.st_size),
                        'getcontenttype': None if item.is_dir() else content_type,
                        'getetag': etag,
                        'displayname': item.name,
                    }

            except (BadMechanismError, SMBAuthenticationError) as e:
                 raise EndpointError(f"There's a problem with the kerberos authentication : {e}")
            except InvalidParameter as e:
                 raise EndpointError("This server does not support this feature actually, but it will come soon!")

        http_context.respond('207 Multi-Status')
        return xml_propfind_response(items)

    @mkcol(r'/api/lmn/webdav/(?P<path>.*)')
    @endpoint(api=True)
    def handle_api_dav_create_directory(self, http_context, path=''):
        baseShare = f'\\\\{samba_realm}\\{self.context.schoolmgr.school}\\'
        path = path.replace('/', '\\')
        try:
            smbclient.makedirs(f'{baseShare}{path}')
        except (ValueError, SMBOSError, NotFound) as e:
            raise EndpointError(e)
        except InvalidParameter as e:
            raise EndpointError(f'Problem with path {path} : {e}')
        return ''