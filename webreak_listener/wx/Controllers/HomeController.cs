using System;
using System.Collections.Generic;
using System.Data.Objects;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using wx;
using wx.Models;

namespace wx.Controllers
{
    public class HomeController : Controller
    {
        private cloudjunsqlEntities db = new cloudjunsqlEntities();

        public ActionResult Index()
        {
            long currentMaxId = 0;
            try
            {
                currentMaxId = db.wx_chat.Select(c => c.ID).Max();
            }
            catch
            {
            }
            long lastId = Math.Max(currentMaxId - Config.Config.DEFAULT_DISPLAY_COUNT, 0);
            // we only display the latest DEFAULT_DISPLAY_COUNT records
            var chatList = db.wx_chat.Where(c => c.ID > lastId && c.CounterPartyID == 1).ToList();
            return View(chatList.Select(ChatDto.GetDtoFromChat).ToList());
        }

        public ActionResult ViewAll()
        {
            long currentMaxId = 0;
            try
            {
                currentMaxId = db.wx_chat.Select(c => c.ID).Max();
            }
            catch
            {
            }
            long lastId = Math.Max(currentMaxId - Config.Config.DEFAULT_DISPLAY_COUNT, 0);
            // we only display the latest DEFAULT_DISPLAY_COUNT records
            var chatList = db.wx_chat.Where(c => c.ID > lastId).ToList();
            return View(chatList.Select(ChatDto.GetDtoFromChat).ToList());
        }

        public ActionResult TestView(string oid)
        {
            var wu = db.wx_user.First(u => string.Equals(u.GuidUrl.ToUpper(), oid.ToUpper()));
            var counterParties = GetCounterParties(wu.ID);
            return View(new KeyValuePair<int, IEnumerable<KeyValuePair<int, string>>>(wu.ID, counterParties));
        }

        public ActionResult TestPartialView(int ownerId, int counterPartyId)
        {
            // we only display the latest DEFAULT_DISPLAY_COUNT records
            var chatIdList = db.wx_owner_chat_map.Where(c => c.OwnerID == ownerId && c.CounterPartyID == counterPartyId)
                            .OrderByDescending(c => c.ChatID)
                            .Select(c => c.ChatID)
                            .Take(Config.Config.DEFAULT_DISPLAY_COUNT).ToList();
            var chatList = db.wx_chat.Where(c => chatIdList.Contains(c.ID)).OrderBy(c => c.ID).ToList();
            return PartialView(chatList.Select(ChatDto.GetDtoFromChat).ToList());
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your app description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }

        // the input is the user id in the database
        public IEnumerable<KeyValuePair<int, string>> GetCounterParties(int userId)
        {
            var list = db.wx_owner_chat_map.Where(m => m.OwnerID == userId)
                         .Select(m => m.CounterPartyID).Distinct().ToList()
                         .Select(
                             c =>
                             new KeyValuePair<int, string>(c,
                                                           MvcApplication.UsernameNicknameCache[
                                                               MvcApplication.UserIdUsernameCache[c]]));
            return list;
        }
    }
}
