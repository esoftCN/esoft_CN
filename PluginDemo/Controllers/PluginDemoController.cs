using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;

using Kusog.Mvc;

namespace PluginDemo.Controllers
{
    [DynamicActionFilter]
    public class PluginDemoController : Controller
    {
        public ActionResult MetaTags()
        {
            return PartialView();
        }

        public ActionResult HeaderIncludesPre()
        {
            return Content(PluginApplication.Instance.HeaderIncludesPre);
        }
        public ActionResult HeaderIncludesPost()
        {
            return Content(PluginApplication.Instance.HeaderIncludesPost);
        }
        public ActionResult FooterIncludes()
        {
            return Content(PluginApplication.Instance.FooterIncludes);
        }
        public ActionResult WidgetContainer(string containerName)
        {
            ViewBag.ContainerName = containerName;
            return PartialView();
        }

        public ActionResult Widget(string widgetId, object widgetOptions)
        {
            ViewBag.widgetId = widgetId;
            ViewBag.widgetOptions = widgetOptions;
            return PartialView();
        }

        public ActionResult PageFooter()
        {
            return Content("");
        }
    }
}
