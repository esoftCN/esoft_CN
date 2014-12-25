using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace SlideshowPlugin
{
    public class SlideShowController : Controller
    {
        //
        // GET: /SlideShow/

        [HttpPost]
        [ValidateInput(false)]
        public ActionResult SaveSlideShow(string id, string html)
        {
            if (string.IsNullOrWhiteSpace(id))
                id = "SlideShow1";
            string fileName = Server.MapPath(@"~\" + id + ".html");
            System.IO.File.WriteAllText(fileName, html);
            return Json(new { result = "success" });
        }

        public ActionResult GetSlideShowHtml(string slideShowId)
        {
            if (string.IsNullOrWhiteSpace(slideShowId))
                slideShowId = "SlideShow1";
            string fileName = Server.MapPath(@"~\" + slideShowId + ".html");
            return Content(System.IO.File.ReadAllText(fileName));
        }

    }
}
