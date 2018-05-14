using System;
using wx.Controllers;

namespace wx.Models
{

    public class ChatDto
    {
        public long ID { get; set; }
        public int OwnerID { get; set; }
        public string OwnerUsername { get; set; }
        public string OwnerUserNickname { get; set; }
        public string FromUsername { get; set; }
        public string FromUserNickname { get; set; }

        // CounterPartyUsername is only needed when webpage reads from the database
        public string CounterPartyUsername { get; set; }
        public string CounterPartyUserNickname { get; set; }

        // ToUsername is only needed when webpage posting messages to server using ajax calls
        public string ToUsername { get; set; }
        public string ToUserNickname { get; set; }

        public string Content { get; set; }
        public int? ImageID { get; set; }
        public int? VoiceID { get; set; }
        public long CreateTime { get; set; }
        public bool IsFromOwner { get; set; }

        public ChatDto()
        {
        }

        // this is for webpage reads from database. CounterPartyUsername is available.
        public static ChatDto GetDtoFromChat(wx_chat chat)
        {
            string ownerUsername = MvcApplication.UserIdUsernameCache[chat.OwnerID];
            string ownerUserNickname = MvcApplication.UsernameNicknameCache[ownerUsername];
            string counterPartyUsername = MvcApplication.UserIdUsernameCache[chat.CounterPartyID];
            string counterPartyUserNickname = MvcApplication.UsernameNicknameCache[counterPartyUsername];
            string fromUsername;
            if (chat.IsFromOwner)
                fromUsername = ownerUsername;
            else
                fromUsername = string.IsNullOrEmpty(chat.FromUsername) ? counterPartyUsername : chat.FromUsername;

            var dto = new ChatDto
                {
                    ID = chat.ID,
                    OwnerID = chat.OwnerID,
                    OwnerUsername = ownerUsername,
                    OwnerUserNickname = ownerUserNickname,
                    FromUsername = fromUsername,
                    FromUserNickname = MvcApplication.UsernameNicknameCache[fromUsername],
                    IsFromOwner = chat.IsFromOwner,
                    CounterPartyUsername = counterPartyUsername,
                    CounterPartyUserNickname = counterPartyUserNickname,
                    Content = chat.Content,
                    ImageID = chat.ImageID,
                    VoiceID = chat.VoiceID,
                    CreateTime = chat.CreateTime,
                };
            return dto;
        }

        // this is for server reads messages from webpage ajax post. ToUsername is available.
        public static wx_chat GetChatFromDto(ChatDto dto)
        {
            bool isFromOwner = false;
            string counterPartyUsername;
            string fromUsername = string.Empty;

            if (dto.OwnerUsername == dto.FromUsername)
            {
                counterPartyUsername = dto.ToUsername;
                isFromOwner = true;
            }
            else
            {
                // check if dto.FromUsername is a chatroom
                if (IsChatRoom(dto.FromUsername))
                {
                    fromUsername = GetFromUsername(dto.Content);
                    dto.Content = GetNewContent(dto.Content);
                }
                counterPartyUsername = dto.FromUsername;
                isFromOwner = false;
            }
            var chat = new wx_chat
                {
                    Content = dto.Content,
                    ImageID = dto.ImageID,
                    VoiceID = dto.VoiceID,
                    CreateTime = dto.CreateTime,
                    OwnerID = MvcApplication.UsernameUserIdCache[dto.OwnerUsername],
                    FromUsername = fromUsername,
                    CounterPartyID = MvcApplication.UsernameUserIdCache[counterPartyUsername],
                    IsFromOwner = isFromOwner
                };
            return chat;
        }

        private static string GetNewContent(string content)
        {
            // need to remove the extra "<br/>", which is 5 char
            return content.Substring(content.IndexOf(':') + 6);
        }

        private static bool IsChatRoom(string username)
        {
            bool value = false;
            return MvcApplication.ChatroomNameCache.TryGetValue(username, out value);
        }

        private static string GetFromUsername(string content)
        {
            return content.Substring(0, content.IndexOf(':'));
        }

        public override string ToString()
        {
            return string.Format("FromUsername-{0},ToUsername-{1},OwnerUsername-{2},CreateTime-{3},Content-{4}",
                                 FromUsername, ToUsername, OwnerUsername, CreateTime, Content);
        }
    }
}