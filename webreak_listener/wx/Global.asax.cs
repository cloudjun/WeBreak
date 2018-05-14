using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace wx
{
    // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801

    public class MvcApplication : System.Web.HttpApplication
    {
        public static Dictionary<string, string> UsernameNicknameCache = null;
        public static Dictionary<int, string> UserIdUsernameCache = null;
        public static Dictionary<long, string> UinUsernameCache = null;
        public static Dictionary<string, int> UsernameUserIdCache = null;
        //public static Dictionary<int, List<KeyValuePair<int, string>>> CounterPartyCache = null;
        public static Dictionary<string, bool> ChatroomNameCache = null;

        protected void Application_Start()
        {
            // Register the default hubs route: ~/signalr
            RouteTable.Routes.MapHubs();

            AreaRegistration.RegisterAllAreas();

            WebApiConfig.Register(GlobalConfiguration.Configuration);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);

            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
            AuthConfig.RegisterAuth();

            using (var db = new cloudjunsqlEntities())
            {
                UsernameNicknameCache = db.wx_user.ToDictionary(u => u.UserName, u => u.NickName);
                UserIdUsernameCache = db.wx_user.ToDictionary(u => u.ID, u => u.UserName);
                UinUsernameCache = db.wx_user.ToDictionary(u => u.Uin, u => u.UserName);
                UsernameUserIdCache = db.wx_user.ToDictionary(u => u.UserName, u => u.ID);
                ChatroomNameCache = db.wx_user.Where(u => u.IsChatroom).ToDictionary(u => u.UserName, u => true);
            }
            System.Diagnostics.Trace.TraceInformation("Cache created. User table is {0} in length. There are {1} chatrooms.", UsernameNicknameCache.Count, ChatroomNameCache.Count);
        }
    }
}