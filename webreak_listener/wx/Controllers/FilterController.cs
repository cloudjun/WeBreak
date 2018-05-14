using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using wx;
using wx.Config;
using wx.Models;

namespace wxqq.Controllers
{
    public class FilterController : Controller
    {
        public static cloudjunsqlEntities db = new cloudjunsqlEntities();

        public ActionResult Index(int id)
        {
            var list = db.wx_chat.Where(c => c.ID >= id).ToList();
            return View(list.Select(ChatDto.GetDtoFromChat));
        }

        public ActionResult Search(string search_name, string search_content, string search_start_time, string oid)
        {
            if (string.IsNullOrEmpty(search_name)
                && string.IsNullOrEmpty(search_content)
                && string.IsNullOrEmpty(search_start_time))
            {
                return View(new List<ChatDto>());
            }

            IEnumerable<wx_chat> chats = db.wx_chat;
            IEnumerable<wx_user> users = db.wx_user;
            int ownerId = db.wx_user.First(u => string.Equals(u.GuidUrl.ToUpper(), oid.ToUpper())).ID;
            var additionalChatIDs = db.wx_owner_chat_map.Where(m => m.OwnerID == ownerId).Select(m => m.ChatID).ToList();
            chats = chats.Where(c => c.OwnerID == ownerId || additionalChatIDs.Contains(c.ID));
            if (!string.IsNullOrEmpty(search_name))
            {
                chats = chats.Join(users, chat => chat.FromUsername, user => user.UserName, (chat, user) => new { chat, user }).Where(z => z.user.NickName.Contains(search_name)).Select(x => x.chat);
            }
            if (!string.IsNullOrEmpty(search_content))
            {
                chats = chats.Where(c => c.Content.Contains(search_content));
            }
            if (!string.IsNullOrEmpty(search_start_time))
            {
                DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, 0).ToLocalTime();
                long ticks = (long) Convert.ToDateTime(search_start_time).Subtract(epoch).TotalSeconds;
                chats = chats.Where(c => c.CreateTime >= ticks);
            }
            return View(chats.OrderByDescending(c => c.ID).Take(Config.DEFAULT_DISPLAY_COUNT).Select(ChatDto.GetDtoFromChat).ToList());
        }
    }
}
