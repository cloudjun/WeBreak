function isEmptyObj(obj) {
    if (JSON.stringify(obj) == '{}' || JSON.stringify(obj) == '[]')
        return true;
}

function isEmpty(value) { 
    if (value == null || value.length === 0)
        return true;
    else if (isEmptyObj(value))
        return true;
    return false;
}

function getRootUrl(url)
{
    tokens = url.toString().split('/');
    return tokens[0] + "//" + tokens[2];
}

// function to decode html
function htmlDecode( html ) {
    var a = document.createElement('wj_abc'); a.innerHTML = html;
    return a.textContent;
};

var image_action_url = "/cgi-bin/mmwebwx-bin/webwxgetmsgimg?MsgID=";
var voice_action_url = "/cgi-bin/mmwebwx-bin/webwxgetvoice?msgid=";
//var root_url = window.content.location.href.substr(0, window.content.location.href.lastIndexOf('/'));
var root_url = getRootUrl(window.content.document.location);
var remote_chat_url = "http://wxkankan.azurewebsites.net/api/Chat";
var remote_user_url = "http://wxkankan.azurewebsites.net/api/User";

// owner_username at a global level. when no messages received/sent, it is the username from UI. After messages received/sent, it is the Uin.
var global_owner_username = "";

// *********************************************** My Functions *************************************************
function postChat_old(fromUser, toUser, content, tick)
{
    var xhr = new XMLHttpRequest();
    // xhr.open("POST", root_url +　"/cgi-bin/mmwebwx-bin/webwxsync?ThisIsWeChatFakePost_Chat");
    xhr.open("POST", remote_chat_url);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send("{'Name':'" + fromUser + "', 'Content':'" + content + "'}");
}

function postChat(jsonObj)
{
    var xhr = new XMLHttpRequest();
    // xhr.open("POST", root_url +　"/cgi-bin/mmwebwx-bin/webwxsync?ThisIsWeChatFakePost_Chat");
    xhr.open("POST", remote_chat_url);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify(jsonObj));
}

function postUserInfo(userInfo)
{
    var xhr = new XMLHttpRequest();
    // xhr.open("POST", root_url +　"/cgi-bin/mmwebwx-bin/webwxsync?ThisIsWeChatFakePost_UserInfo");
    xhr.open("POST", remote_user_url);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify(userInfo));
}

function base64Encode(str) {
    var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = "", i = 0, len = str.length, c1, c2, c3;
    while (i < len) {
        c1 = str.charCodeAt(i++) & 0xff;
        if (i == len) {
            out += CHARS.charAt(c1 >> 2);
            out += CHARS.charAt((c1 & 0x3) << 4);
            out += "==";
            break;
        }
        c2 = str.charCodeAt(i++);
        if (i == len) {
            out += CHARS.charAt(c1 >> 2);
            out += CHARS.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
            out += CHARS.charAt((c2 & 0xF) << 2);
            out += "=";
            break;
        }
        c3 = str.charCodeAt(i++);
        out += CHARS.charAt(c1 >> 2);
        out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
        out += CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
        out += CHARS.charAt(c3 & 0x3F);
    }
    return out;
}


// ****** sample usage
// console.log(base64Encode(getBinary('http://www.oodesign.com/images/creational/singleton-pattern-preview.png')));
// ******
function getBinary(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.send(null);
    return xhr.responseText;
}

// For the friend list json (2_contact message), MemberList is not empty
function getFriendInfo(jsonResponse) {
    var memberList = jsonResponse.MemberList;
    var jsonObj = [];
    var wrapperObj = [];

    if (!isEmpty(memberList)) {
        for (var i=0; i <memberList.length; i++) {
            var uin = memberList[i].Uin;
            var userName = memberList[i].UserName;
            var nickName = memberList[i].NickName;
            // var headImgUrl = memberList[i].HeadImgUrl;
            // get the image binary as base64
            //var headImg = "img:" + base64Encode(getBinary(root_url+headImgUrl));
            jsonObj.push({'Uin':uin,'UserName':userName,'NickName':nickName});
        }
    }

    wrapperObj.push({'WxUserArray':jsonObj});
    return wrapperObj[0];
}

// For the chatroom json (batchgetcontact), ContactList is not empty
function getChatroomInfo(jsonResponse) {
    var contactList = jsonResponse.ContactList;
    var jsonObj = [];
    var wrapperObj = [];

    // set the global owner username
    // owner_username = jsonResponse.User.UserName;

    if (!isEmpty(contactList)) {
        for (var i=0; i<contactList.length; i++) {
            var memberCount = contactList[i].MemberCount;
            if (memberCount == 0) {
                // membercount==0 means a person, not a chatroom
                var uin = contactList[i].Uin;
                var userName = contactList[i].UserName;
                var nickName = contactList[i].NickName;
                // var headImgUrl = contactList[i].HeadImgUrl;
                // get the image binary as base64
                //var headImg = "img:" + base64Encode(getBinary(root_url+headImgUrl));
                jsonObj.push({'Uin':uin,'UserName':userName,'NickName':nickName});
            } else {
                // membercount>0 means a chatroom
                var uin = contactList[i].Uin;
                var userName = contactList[i].UserName;
                var nickName = contactList[i].NickName;
                var ownerUin = contactList[i].OwnerUin;
                // var headImgUrl = contactList[i].HeadImgUrl;
                // get the image binary as base64
                //var headImg = "img:" + base64Encode(getBinary(root_url+headImgUrl));
                jsonObj.push({'Uin':uin,'UserName':userName,'NickName':nickName,'IsChatroom':true,'ChatroomMasterID':ownerUin});

                // loop, get each member of the chatroom
                var members = contactList[i].MemberList;
                for (var k=0; k<memberCount; k++) {
                    var mUin = members[k].Uin;
                    var mUserName = members[k].UserName;
                    var mNickName = members[k].NickName;
                    jsonObj.push({'Uin':mUin,'UserName':mUserName,'NickName':mNickName});
                }
            }
        }
    }

    wrapperObj.push({'WxUserArray':jsonObj});
    return wrapperObj[0];
}

// ************************************************************************************************



FBL.ns(function() { with (FBL) { 

    // const Cc = Components.classes;
    // const Ci = Components.interfaces;

    // const dirService = Cc["@mozilla.org/file/directory_service;1"]
    //     .getService(Ci.nsIProperties);

    function WxkankanPanel() {}
    WxkankanPanel.prototype = extend(Firebug.Panel,
    {
        name: "Wxkankan",
        title: "微信看看",

        initialize: function() {
          Firebug.Panel.initialize.apply(this, arguments);
          this.refresh();
        },

        refresh: function()
        {
            this.MyTemplate.render(this.panelNode);
        }        
    });

    // ************************************************************************************************
    // Module implementation
    Firebug.wxkankanModule = extend(Firebug.Module,
    {
        initialize: function(owner)
        {
            Firebug.Module.initialize.apply(this, arguments);

            // Register NetMonitor listener
            this.netListener = new NetListener();
            Firebug.NetMonitor.addListener(this.netListener);

            // Firebug.NetMonitor.NetRequestTable.addListener(RequestTableListener);
            // Firebug.JSONViewerModel.addListener(JSONListener);
        },

        shutdown: function()
        {
            Firebug.Module.shutdown.apply(this, arguments);

            // Unregister NetMonitor listener
            Firebug.NetMonitor.removeListener(this.netListener);

            // Firebug.NetMonitor.NetRequestTable.removeListener(RequestTableListener);
            // Firebug.JSONViewerModel.removeListener(JSONListener);
        }
    });

    // ************************************************************************************************
    // Net Panel Listener

    function NetListener(outputStream)
    {
        // Get unique file within user profile directory. 
        // var file = dirService.get("ProfD", Ci.nsIFile);
        // file.append("netlistener");
        // file.append("netMonitor.txt");
        // file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

        // Initialize output stream.
        // this.outputStream =
        //     Cc["@mozilla.org/network/file-output-stream;1"]
        //     .createInstance(Ci.nsIFileOutputStream);

        // write, create, truncate
        // this.outputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    }

    NetListener.prototype = 
    {
        onRequest: function(context, file)
        {
            // if (FBTrace.DBG_NETLISTENER)
            //     FBTrace.sysout("netListener.onResponse; " + (file ? file.href : ""));
        },

        onExamineResponse: function(context, request)
        {
            // if (FBTrace.DBG_NETLISTENER)
            //     FBTrace.sysout("netListener.onExamineResponse;" + request.name);
        },

        onResponse: function(context, file)
        {
            // if (FBTrace.DBG_NETLISTENER)
            //     FBTrace.sysout("netListener.onResponse; " + (file ? file.href : ""));

        },

        onResponseBody: function(context, file)
        {
            try
            {
                var jsonResponse = JSON.parse(file.responseText);

                if (file.href.indexOf("webwxsync") != -1)
                {
                    var postText = JSON.parse(file.postText);
                    var owner_username = postText.BaseRequest.Uin;
                    global_owner_username = owner_username;

                    // "webwxsync" means a possible incoming message
                    root_url = getRootUrl(file.href);
                    if (jsonResponse.AddMsgCount == "1")
                    {
                        // AddMsgCount==1 means there is a new message coming in
                        var fromUser = jsonResponse.AddMsgList[0].FromUserName;
                        var toUser = jsonResponse.AddMsgList[0].ToUserName;
                        // tick by seconds, it is 10 digits
                        var createTime = jsonResponse.AddMsgList[0].CreateTime;
                        var msgID = jsonResponse.AddMsgList[0].MsgId;
                        var content = jsonResponse.AddMsgList[0].Content;

                        if (isEmpty(content))
                            // skip sending empty message
                            return;

                        // alert(file.toSource());

                        // check if the content is sent from a chatroom, if it is it will have 
                        // a format like "aaa:<br/>blah blah". But an exception case is if it is 
                        // a img/voice, it will also put "aaa:<br/>" in the content if the sender
                        // is me using phone.
                        var actualFromUser = "";
                        if (fromUser.indexOf("@chatroom") != -1)
    					{
                            if (content.indexOf(' ') != -1)
                            {
                                var firstNonWhitespaceString = content.substr(0, content.indexOf(' '));
    							var i = firstNonWhitespaceString.indexOf(":<br/>");
                                if (i != -1)
    							{
                                    actualFromUser = firstNonWhitespaceString.substr(0, i);
    							}
                            }
    					}

                        // MsgType - 1  : normal
                        // MsgType - 3  : image
                        // MsgType - 34 : voice
                        // MsgType - 49 : html
                        // MsgType - 51 : probably status update, ignore
                        var msgType = jsonResponse.AddMsgList[0].MsgType;
                        if (msgType == "1")
                        {
    						// normal message
                        }
                        else if (msgType == "3")
                        {
                            var imageURL = root_url + image_action_url + msgID;
                            // get the image binary as base64
                            var content = "img:" + base64Encode(getBinary(imageURL));
                            if (actualFromUser != "")
                                content = actualFromUser + ":<br/>" + content;
                        }
                        else if (msgType == "34")
                        {
                            var voiceURL = root_url + voice_action_url + msgID;
                            // get the voice binary as base64
                            var content = "voice:" + base64Encode(getBinary(voiceURL));
                            if (actualFromUser != "")
                                content = actualFromUser + ":<br/>" + content;
                        }
                        else if (msgType == "49")
                        {
                            // a html message
                            var content = jsonResponse.AddMsgList[0].Content;
                            content = htmlDecode(content);
                            if (actualFromUser != "")
                                content = actualFromUser + ":<br/>" + content;
                        }
                        else if (msgType == "51")
                        {
                            //ignore msgType 51
                            return;
                        }
                        var jsonObj = [];
                        jsonObj.push({'FromUsername':fromUser,'Content':content,'ToUsername':toUser,'OwnerUsername':owner_username,'CreateTime':createTime});
                        postChat(jsonObj[0]);
                    }
                }
                else if (file.href.indexOf("webwxsendmsg") != -1)
                {
                    // firefox 23 has this "nice feature" that blocks http/https mixed contents, so a picture cannot be sent from the web.
                    // therefore, the msgType and imageURL is just imaginary.
                    // TODO: hope that the WX team will put everything under https.
                    var postText = JSON.parse(file.postText);
                    var owner_username = postText.BaseRequest.Uin;
                    global_owner_username = owner_username;
                    
    				// alert(file.toSource());
                    var jsonResponse = JSON.parse(file.postText);
                    var fromUser = jsonResponse.Msg.FromUserName;
                    var toUser = jsonResponse.Msg.ToUserName;
                    // tick by milli seconds, it is 13 digits. So get the first 10 digit to get the value in seconds.
                    var createTime = Math.floor(jsonResponse.Msg.ClientMsgId/1000);

                    // MsgType - 1  : normal
                    // MsgType - 3  : image
                    // MsgType - 34 : voice
                    var msgType = jsonResponse.Msg.Type;
                    if (msgType == "1")
                    {
                        var content = jsonResponse.Msg.Content;
                        if (isEmpty(content))
                        {
                            // skip sending empty message
                            return;
                        }
                    }
                    else if (msgType == "3")
                    {
                        var imageURL = root_url + image_action_url + msgID;
                        // get the image binary as base64
                        var content = "img:" + base64Encode(getBinary(imageURL));
                    }
                    else if (msgType == "34")
                    {
                        var voiceURL = root_url + voice_action_url + msgID;
                        // get the voice binary as base64
                        var content = "voice:" + base64Encode(getBinary(voiceURL));
                    }
                    else if (msgType == "49")
                    {
                        // a html message
                        var content = jsonResponse.AddMsgList[0].Content;
                        content = htmlDecode(content);
                    }                
                    var jsonObj = [];
                    jsonObj.push({'FromUsername':fromUser,'Content':content,'ToUsername':toUser,'OwnerUsername':owner_username,'CreateTime':createTime});
                    postChat(jsonObj[0]);
                }
                // else if (file.href.indexOf("webwxinit") != -1)
                // {
                //     // we get the chatroom information from "webwxinit"
                //     var chatroomInfo = getChatroomInfo(jsonResponse);
                //     postUserInfo(chatroomInfo);
                // } 
                else if (file.href.indexOf("webwxgetcontact") != -1)
                {
                    // we get the direct friends information from "webwxgetcontact"
                    var friendInfo = getFriendInfo(jsonResponse);
                    postUserInfo(friendInfo);
                } 
                else if (file.href.indexOf("webwxbatchgetcontact") != -1)
                {
                    // we get the members of a chatroom information from "webwxbatchgetcontact"
                    var chatroomInfo = getChatroomInfo(jsonResponse);
                    postUserInfo(chatroomInfo);
                }
            }
            catch (err)
            {
                // if (FBTrace.DBG_NETLISTENER || FBTRace.DBG_ERRORS)
                //     FBTrace.sysout("netListener.onResponse; EXCEPTION", err);
            }
        }
    };

    // var RequestTableListener = 
    // {
    //     onCreateRequestEntry: function(row, panel)
    //     {
            // if (FBTrace.DBG_NETLISTENER)
            //     FBTrace.sysout("RequestTableListener.onCreateRequestEntry; " +
            //         panel.context.getName());
    //     }
    // }

    // var JSONListener =
    // {
    //     onParseJSON: function(file)
    //     {
            // if (FBTrace.DBG_NETLISTENER)
            //     FBTrace.sysout("JSONListener.onParseJSON; " + file.href, file);
    //     }
    // }

    WxkankanPanel.prototype.MyTemplate = domplate(
    {
        tag:
            DIV(
              SPAN("如果你需要将你的对话内容加密，请输入一个只有你自己知道的密码。这样即使在微信看看服务器上你的对话内容也是加密的。但是加了密的对话无法和别人分享，而且要是你忘记了密码的话，谁也救不了你了，x_x"),
              BR(),
              INPUT(
                        {
                            id:"myinput",
                            size:"50"
                        }
                    ),
              BUTTON(
                        {
                            checked: "true",
                            type: "checkbox",
                            onclick: "$setPassword"
                        },
                        "密码只能设置一次,请点击确认。"
                    ),
              BR(),
              BUTTON(
                        {
                            id: "newurl",
                            onclick: "$getNewUrl"
                        },
                     "点击此处得到一个新的对应我ID的微信看看连接"
                  ),
              SPAN({id:"NewResultUrl"}),    
              BR(),
              BUTTON(
                        {
                            id: "existingurl",
                            onclick: "$getExistingUrl"
                        },
                     "点击此处查看已有的微信看看连接"
                  ),
              SPAN({id:"ExistResultUrl"})    
            ),

        setPassword: function(event)
        {
            alert("此功能尚未实现");
        },

        getNewUrl: function(event)
        {
            // var nodes = event.target.parentNode.childNodes;
            // for (var i=0; i<nodes.length; i++)
            //     alert(i + ":" + nodes[i]);
            //alert(event.target.parentNode.childNodes[2].value);

            // this is to get the owner_username from UI
            if (global_owner_username == "") 
            {
                // if owner_username is empty, we still can get it from the webpage
                var profile = window.content.document.getElementById("profile");
                if (profile != null)
                {
                    var myProfile = profile.getElementsByClassName("myProfile")[0];
                    if (myProfile != null)
                    {
                        var img = myProfile.getElementsByTagName("img")[0];
                        if (img != null) 
                        {
                            var src = img.getAttribute("src");
                            var n = src.indexOf("username=");
                            global_owner_username = src.substring(n+9);
                        }
                    }
                }
            }

            var xhr = new XMLHttpRequest();
            xhr.open("GET", remote_user_url + "/GetNewGuidUrl?userid=" + global_owner_username);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send();
            alert("得到新的连接");
            event.target.parentNode.childNodes[6].innerHTML = xhr.responseText.replace(/"/g,'');
            event.target.parentNode.childNodes[9].innerHTML = "";
        },

        getExistingUrl: function(event)
        {
            // this is to get the owner_username from UI
            if (global_owner_username == "") 
            {
                // if owner_username is empty, we still can get it from the webpage
                var profile = window.content.document.getElementById("profile");
                if (profile != null)
                {
                    var myProfile = profile.getElementsByClassName("myProfile")[0];
                    if (myProfile != null)
                    {
                        var img = myProfile.getElementsByTagName("img")[0];
                        if (img != null) 
                        {
                            var src = img.getAttribute("src");
                            var n = src.indexOf("username=");
                            global_owner_username = src.substring(n+9);
                        }
                    }
                }
            }

            var xhr = new XMLHttpRequest();
            xhr.open("GET", remote_user_url + "/GetExistingGuidUrl?userid=" + global_owner_username);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send();
            alert("得到现有的连接");
            event.target.parentNode.childNodes[9].innerHTML = xhr.responseText.replace(/"/g,'');
        },

        render: function(parentNode)
        {
            this.tag.replace({}, parentNode);
        }
    });

    // ************************************************************************************************
    // Registration

    Firebug.registerModule(Firebug.wxkankanModule);

    Firebug.registerPanel(WxkankanPanel);

    // ************************************************************************************************
    }
});

