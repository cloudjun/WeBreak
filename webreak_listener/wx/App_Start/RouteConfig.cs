using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace wx
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                "ViewAll", // Route name
                "{controller}/{action}", // URL with parameters
                new { controller = "Home", action = "ViewAll" } // Parameter defaults
            );

            routes.MapRoute(
                "TestView", // Route name
                "{controller}/{action}", // URL with parameters
                new { controller = "Home", action = "TestView" } // Parameter defaults
            );

            routes.MapRoute(
                "TestPartialView", // Route name
                "{controller}/{action}", // URL with parameters
                new { controller = "Home", action = "TestPartialView" } // Parameter defaults
            );

        }
    }
}