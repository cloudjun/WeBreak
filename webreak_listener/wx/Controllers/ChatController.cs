using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using System.Web.Http.Cors;
using Microsoft.AspNet.SignalR;
using wx.Models;

namespace wx.Controllers
{
    [EnableCors(origins: "*", headers: "*", methods: "get,post")]
    public class ChatController : ApiController
    {
        // GET api/Chat
        //public IEnumerable<wx_chat> Getwx_chat()
        //{
        //    return db.wx_chat.AsEnumerable();
        //}

        // GET api/Chat/5
        public ChatDto Getwx_chat(long id)
        {
            using (var db = new cloudjunsqlEntities())
            {
                wx_chat wx_chat = db.wx_chat.Find(id);
                if (wx_chat == null)
                {
                    throw new HttpResponseException(Request.CreateResponse(HttpStatusCode.NotFound));
                }

                return ChatDto.GetDtoFromChat(wx_chat);
            }
        }

        // PUT api/Chat/5
        //public HttpResponseMessage Putwx_chat(long id, ChatDto chat)
        //{
        //    if (!ModelState.IsValid)
        //    {
        //        return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
        //    }

        //    if (id != chat.ID)
        //    {
        //        return Request.CreateResponse(HttpStatusCode.BadRequest);
        //    }

        //    db.Entry(chat).State = EntityState.Modified;

        //    try
        //    {
        //        db.SaveChanges();
        //    }
        //    catch (DbUpdateConcurrencyException ex)
        //    {
        //        return Request.CreateErrorResponse(HttpStatusCode.NotFound, ex);
        //    }

        //    return Request.CreateResponse(HttpStatusCode.OK);
        //}

        // POST api/Chat
        
        public HttpResponseMessage Postwx_chat(ChatDto dto)
        {
            if (ModelState.IsValid)
            {
                System.Diagnostics.Trace.TraceInformation("Chat Message received: " + dto);

                // the OwnerUsername is Uni, change it to username
                dto.OwnerUsername = MvcApplication.UinUsernameCache[long.Parse(dto.OwnerUsername)];

                wx_chat chat = ChatDto.GetChatFromDto(dto);
                // ignore if content is empty
                if (string.IsNullOrEmpty(chat.Content) || string.IsNullOrWhiteSpace(chat.Content))
                {
                    HttpResponseMessage resp = Request.CreateResponse(HttpStatusCode.OK);
                    return resp;
                }

                using (var db = new cloudjunsqlEntities())
                {
                    // check if the same message is already in the database
                    long existingChatId = IsAlreadyInDb(chat);
                    if (existingChatId == -1)
                    {
                        // new message
                        db.wx_chat.Add(chat);
                        db.SaveChanges();
                        // insert the new chat into the owner-chat map table
                        var map = new wx_owner_chat_map
                            {
                                ChatID = chat.ID,
                                OwnerID = chat.OwnerID,
                                CounterPartyID = chat.CounterPartyID
                            };
                        db.wx_owner_chat_map.Add(map);
                        db.SaveChanges();
                    }
                    else
                    {
                        // chat already exists, add one entry in the owner_chat_map table
                        chat.ID = existingChatId;
                        var map = new wx_owner_chat_map
                            {
                                ChatID = existingChatId,
                                OwnerID = chat.OwnerID,
                                CounterPartyID = chat.CounterPartyID
                            };
                        db.wx_owner_chat_map.Add(map);
                        db.SaveChanges();
                    }

                    // update the web mvc client using signalr
                    var chatDto = ChatDto.GetDtoFromChat(chat);
                    // get the signalr client id from the database for this owner id
                    var signalrId = db.wx_user.Single(u => u.ID == chat.OwnerID).SignalrID;
                    if (!string.IsNullOrEmpty(signalrId))
                    {
                        var hub = GlobalHost.ConnectionManager.GetHubContext("Chat");
                        try
                        {
                            hub.Clients.Client(signalrId).addMessage(chatDto);
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Trace.TraceInformation("SignalrID - {0} could be bad. Execption-{1}", signalrId, ex.Message);
                        }
                    }
                }

                HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.Created); 
                return response;
            }
            else
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState);
            }
        }

        // DELETE api/Chat/5
        public HttpResponseMessage Deletewx_chat(long id)
        {
            using (var db = new cloudjunsqlEntities())
            {
                wx_chat wx_chat = db.wx_chat.Find(id);
                if (wx_chat == null)
                {
                    return Request.CreateResponse(HttpStatusCode.NotFound);
                }

                db.wx_chat.Remove(wx_chat);

                try
                {
                    db.SaveChanges();
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, ex);
                }

                return Request.CreateResponse(HttpStatusCode.OK, wx_chat); 
            }
        }

        // if return -1, it means there is no such record in DB
        private long IsAlreadyInDb(wx_chat chat)
        {
            long resultChatId = -1;
            // it is a same message, if the CreateTIme/FromUser/ToUser is the same
            if (string.IsNullOrEmpty(chat.FromUsername))
            {
                // chat.FromUsername is empty. It could be a p2p message, or a chatroom message sent from chat.OwnerId
                string ownerUsername = MvcApplication.UserIdUsernameCache[chat.OwnerID];
                using (var db = new cloudjunsqlEntities())
                {
                    var result = db.wx_chat.FirstOrDefault(c => c.CreateTime == chat.CreateTime
                                                && (c.CounterPartyID == chat.CounterPartyID)
                                                && (string.Equals(c.FromUsername.ToUpper(), ownerUsername.ToUpper())));
                    if (result != null)
                    {
                        resultChatId = result.ID;
                    }
                }
            }
            else
            {
                // chat.FromUsername is not empty, it means this is from another chatroom user other than chat.OwnerId
                int ownerId = MvcApplication.UsernameUserIdCache[chat.FromUsername];
                using (var db = new cloudjunsqlEntities())
                {
                    var result = db.wx_chat.FirstOrDefault(c => c.CreateTime == chat.CreateTime
                                               && c.CounterPartyID == chat.CounterPartyID
                                               && (string.Equals(c.FromUsername.ToUpper(), chat.FromUsername.ToUpper())
                                                   || (c.OwnerID == ownerId && c.IsFromOwner)));
                    if (result != null)
                    {
                        resultChatId = result.ID;
                    }
                }
            }
            return resultChatId;
        }

        //private long GetChatId(wx_chat chat)
        //{
        //    using (var db = new cloudjunsqlEntities())
        //    {
        //        return db.wx_chat.First(c => c.CreateTime == chat.CreateTime
        //                            && string.Equals(c.FromUsername.ToUpper(), chat.FromUsername.ToUpper())
        //                            && c.CounterPartyID == chat.CounterPartyID).ID; 
        //    }
        //}
    }
}