/*
    It looks like:
    0) user id changes for every login (not sure about the other users)
    1) when receive a msg from a group, the FromUserName will be "@@xxxx", so use "@@" to tell this is a group msg.
       xxxx is the group/chatroom id.
       The content will be "@yyyy:<br/>Message Content", and "yyyy" is the sender's id.
    2) when receive a msg from a peer, the FromUserName will just be a single "@xxxx".
    3) webwxgetcontact - get all the contact list from the address book including GongZhongHao

 */

var image_action_url = "/cgi-bin/mmwebwx-bin/webwxgetmsgimg?MsgID=";
var voice_action_url = "/cgi-bin/mmwebwx-bin/webwxgetvoice?msgid=";
//var root_url = window.content.location.href.substr(0, window.content.location.href.lastIndexOf('/'));
//var root_url = getRootUrl(window.content.document.location);
var root_url = "https://web2.wechat.com/";
// var remote_chat_url = "http://wxkankan.azurewebsites.net/api/Chat";
// var remote_user_url = "http://wxkankan.azurewebsites.net/api/User";
var remote_chat_url = "http://cloudwx.azurewebsites.net/api/Chat";
var remote_user_url = "http://cloudwx.azurewebsites.net/api/User";

// owner_username at a global level. when no messages received/sent, it is the username from UI. After messages received/sent, it is the Uin.
var global_owner_username = "";

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
}

// *********************************************** My Functions *************************************************
// function postChat_old(fromUser, toUser, content, tick)
// {
//     var xhr = new XMLHttpRequest();
//     // xhr.open("POST", root_url + "/cgi-bin/mmwebwx-bin/webwxsync?ThisIsWeChatFakePost_Chat");
//     xhr.open("POST", remote_chat_url);
//     xhr.setRequestHeader("Content-type", "application/json");
//     xhr.send("{'Name':'" + fromUser + "', 'Content':'" + content + "'}");
// }

function postChat(jsonObj)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", remote_chat_url);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify(jsonObj));
    // alert("xhr done, data="+JSON.stringify(jsonObj));
    chrome.devtools.inspectedWindow.eval('console.log("xhr done, data="');
}

function postUserInfo(userInfo)
{
    var xhr = new XMLHttpRequest();
    // xhr.open("POST", root_url + "/cgi-bin/mmwebwx-bin/webwxsync?ThisIsWeChatFakePost_UserInfo");
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


//responseBody is the response body, request is the request object
function process(responseBody, request)
{
    try
    {
        var jsonResponse;
        try
        {
            jsonResponse = JSON.parse(responseBody);
        }
        catch (err)
        {
            // not a valid json, it means this is not sth we care about
            return;
        }

        if (request.url.indexOf("webwxsync") != -1)
        {
            // var postText = JSON.parse(request.postData.text);
            // var owner_username = postText.BaseRequest.Uin;
            // global_owner_username = owner_username;

            // "webwxsync" means a possible incoming message
            root_url = getRootUrl(request.url);
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

                // alert(request.toSource());

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
                // MsgType - 10000 : 加入群聊之类的消息
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

                //postChat(jsonObj[0]);
                alert(JSON.stringify(jsonObj));
            }
        }
        else if (request.url.indexOf("webwxsendmsg") != -1)
        {
            var postText;
            try
            {
                postText = JSON.parse(request.postData.text);
            }
            catch (err)
            {
                alert("json parse error: " + err);
            }
            var owner_username = postText.BaseRequest.Uin;
            global_owner_username = owner_username;

            // alert(request.toSource());
            var jsonResponse = postText;
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
        // else if (request.url.indexOf("webwxinit") != -1)
        // {
        //     // we get the chatroom information from "webwxinit"
        //     var chatroomInfo = getChatroomInfo(jsonResponse);
        //     postUserInfo(chatroomInfo);
        // }
        else if (request.url.indexOf("webwxgetcontact") != -1)
        {
            // we get the direct friends information from "webwxgetcontact"
            //var friendInfo = getFriendInfo(jsonResponse);
            //postUserInfo(friendInfo);
        }
        else if (request.url.indexOf("webwxbatchgetcontact") != -1)
        {
            // we get the members of a chatroom information from "webwxbatchgetcontact"
            //var chatroomInfo = getChatroomInfo(jsonResponse);
            //postUserInfo(chatroomInfo);
        }
    }
    catch (err)
    {
        // if (FBTrace.DBG_NETLISTENER || FBTRace.DBG_ERRORS)
        //     FBTrace.sysout("netListener.onResponse; EXCEPTION", err);
        alert("error:" + err);
    }
}


chrome.devtools.network.onRequestFinished.addListener(
	function(req) {
		req.getContent(
			function(content, encoding) {
				// if (req.request.url.indexOf("webwxsync") != -1) {
				// 	alert("url=" + req.request.url + "\n\ncontent=" + content);
				// } else if (req.request.url.indexOf("webwxsendmsg") != -1) {
				// 	alert("url=" + req.request.url + "\n\npostData=" + req.request.postData.text);
				// }
                process(content, req.request);
			}
		);
	}
);
