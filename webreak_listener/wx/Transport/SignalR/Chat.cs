using System;
using System.Linq;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using wx.Models;

namespace wx.Transport.SignalR
{
    public class Chat : Hub
    {
        public void Send(string message)
        {
            Clients.All.addMessage(message);
        }

        public override System.Threading.Tasks.Task OnConnected()
        {
            // ownerId is the guid url part
            string ownerId = Context.QueryString["ownerId"];

            using (var db = new cloudjunsqlEntities())
            {
                var user = db.wx_user.First(u => u.GuidUrl == ownerId);
                user.SignalrID = Context.ConnectionId;
                db.SaveChanges();
            }

            return base.OnConnected();
        }

        public override System.Threading.Tasks.Task OnDisconnected()
        {
            // ownerId is the guid url part
            string ownerId = Context.QueryString["ownerId"];
            using (var db = new cloudjunsqlEntities())
            {
                var user = db.wx_user.First(u => u.GuidUrl == ownerId);
                user.SignalrID = string.Empty;
                db.SaveChanges();
            }
            return base.OnDisconnected();
        }

        // signalr IDs are seperated by comma
        private string AddSignalrID(string signalrId, string connectionId)
        {
            if (string.IsNullOrEmpty(signalrId))
            {
                return connectionId;
            }

            if (signalrId.Split(',').All(s => s != connectionId))
            {
                return signalrId + "," + connectionId;
            }
            else
            {
                return signalrId;
            }
        }

        private string RemoveSignalrID(string signalrId, string connectionId)
        {
            if (string.IsNullOrEmpty(signalrId))
            {
                return string.Empty;
            }

            var list = signalrId.Split(',').ToList();
            list.Remove(connectionId);
            return string.Join(",", list);
        }
    }
}