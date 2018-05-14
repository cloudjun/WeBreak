using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Web;
using System.Web.Http;

namespace wx.Controllers
{
    public class JsonWrapper
    {
        public List<wx_user> WxUserArray { get; set; }
        public override string ToString()
        {
            return string.Join("!!", WxUserArray);
        }
    }

    public class UserController : ApiController
    {
        private cloudjunsqlEntities db = new cloudjunsqlEntities();

        // GET api/User
        public IEnumerable<wx_user> Getwx_user()
        {
            return db.wx_user.AsEnumerable();
        }

        // GET api/User/5
        //public wx_user Getwx_user(int id)
        //{
        //    wx_user wx_user = db.wx_user.Find(id);
        //    if (wx_user == null)
        //    {
        //        throw new HttpResponseException(Request.CreateResponse(HttpStatusCode.NotFound));
        //    }
        //    return wx_user;
        //}

        // Get api/User/GetCounterPartiy/53
        // get all the counterparties' ID/username for the user id
        [ActionName("GetCounterPartyAction")]
        public HttpResponseMessage Get(int userId)
        {
            var list = GetCounterPartiy(userId);

            return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, list);
        }

        //TODO: this is a duplicate for HomeController.
        public IEnumerable<KeyValuePair<int, string>> GetCounterPartiy(int userId)
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


        // PUT api/User/5
        public HttpResponseMessage Putwx_user(int id, wx_user wx_user)
        {
            if (!ModelState.IsValid)
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
            }

            if (id != wx_user.ID)
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest);
            }

            db.Entry(wx_user).State = EntityState.Modified;

            try
            {
                db.SaveChanges();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, ex);
            }

            return Request.CreateResponse(HttpStatusCode.OK);
        }

        // POST api/User
        public HttpResponseMessage Postwx_user(JsonWrapper jsonWrapper)
        {
            if (ModelState.IsValid)
            {
                System.Diagnostics.Trace.TraceInformation("User message received: " + jsonWrapper.WxUserArray);

                jsonWrapper.WxUserArray.ForEach(user =>
                {
                    if (!db.wx_user.Any(u => u.Uin == user.Uin))
                    {
                        db.wx_user.Add(user);
                    }
                    else
                    {
                        var wu = db.wx_user.Single(u => u.Uin == user.Uin);
                        wu.ChatroomMasterID = user.ChatroomMasterID;
                        wu.HeadImg = user.HeadImg;
                        wu.IsChatroom = user.IsChatroom;
                        wu.NickName = user.NickName;
                        wu.UserName = user.UserName;
                        user.ID = wu.ID;
                    }
                });
                db.SaveChanges();

                // update cache
                foreach (var wxUser in jsonWrapper.WxUserArray)
                {
                    MvcApplication.UserIdUsernameCache[wxUser.ID] = wxUser.UserName;
                    MvcApplication.UsernameNicknameCache[wxUser.UserName] = wxUser.NickName;
                    MvcApplication.UinUsernameCache[wxUser.Uin] = wxUser.UserName;
                    MvcApplication.UsernameUserIdCache[wxUser.UserName] = wxUser.ID;
                    if (wxUser.IsChatroom)
                        MvcApplication.ChatroomNameCache[wxUser.UserName] = true;
                }
                System.Diagnostics.Trace.TraceInformation("User message received, cache updated successfully");

                HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.Created);
                return response;
            }
            else
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
            }
        }

        // DELETE api/User/5
        public HttpResponseMessage Deletewx_user(int id)
        {
            wx_user wx_user = db.wx_user.Find(id);
            if (wx_user == null)
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }

            db.wx_user.Remove(wx_user);

            try
            {
                db.SaveChanges();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, ex);
            }

            return Request.CreateResponse(HttpStatusCode.OK, wx_user);
        }

        // Get api/User/GetCache?cacheName=xxx
        public HttpResponseMessage GetCache(string cacheName)
        {
            if ("UserIdUsernameCache".Equals(cacheName, StringComparison.OrdinalIgnoreCase))
            {
                return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, MvcApplication.UserIdUsernameCache);
            }
            else if ("UinUsernameCache".Equals(cacheName, StringComparison.OrdinalIgnoreCase))
            {
                return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, MvcApplication.UinUsernameCache);
            }
            else if ("UsernameUserIdCache".Equals(cacheName, StringComparison.OrdinalIgnoreCase))
            {
                return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, MvcApplication.UsernameUserIdCache);
            }
            else if ("ChatroomNameCache".Equals(cacheName, StringComparison.OrdinalIgnoreCase))
            {
                return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, MvcApplication.ChatroomNameCache);
            }
            else
            {
                return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, MvcApplication.UsernameNicknameCache);
            }        
        }

        // Get api/User/GetNewGuidUrl?userid=xxx
        public string GetNewGuidUrl(string userid)
        {
            // the userid could be a wx username or a Uin
            long temp;
            wx_user wu;
            if (long.TryParse(userid, out temp))
            {
                // it is Uin
                wu = db.wx_user.First(u => u.Uin == temp);
            }
            else
            {
                // it is username
                wu = db.wx_user.First(u => string.Equals(u.UserName.ToUpper(), userid.ToUpper()));
            }

            var guid1 = Guid.NewGuid();
            var guid2 = Guid.NewGuid();
            var guid3 = Guid.NewGuid();
            var newGuid =
                new StringBuilder().Append(guid1)
                                   .Append(guid2)
                                   .Append(guid3)
                                   .ToString();
            wu.GuidUrl = newGuid;
            db.SaveChanges();

            return string.Format("{0}/home/testview?oid={1}", Config.Config.URL_PREFIX, newGuid);
        }

        // Get api/User/GetExistingGuidUrl?userid=xxx
        public HttpResponseMessage GetExistingGuidUrl(string userid)
        {
            // the userid could be a wx username or a Uin
            long temp;
            wx_user wu;
            if (long.TryParse(userid, out temp))
            {
                // it is Uin
                wu = db.wx_user.First(u => u.Uin == temp);
            }
            else
            {
                // it is username
                wu = db.wx_user.First(u => string.Equals(u.UserName.ToUpper(), userid.ToUpper()));
            }

            var url = string.Format("{0}/home/testview?oid={1}", Config.Config.URL_PREFIX, wu == null ? "" : wu.GuidUrl);
            return ControllerContext.Request.CreateResponse(HttpStatusCode.OK, url);
        }

        protected override void Dispose(bool disposing)
        {
            db.Dispose();
            base.Dispose(disposing);
        }
    }
}