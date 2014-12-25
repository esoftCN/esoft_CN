using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Kusog.Mvc;

namespace SlideshowPlugin
{
    /// <summary>
    /// 
    /// </summary>
    /// <remarks>This plugin inherits directly from BaseMvcPlugin rather than a child of BaseMvcPlugin because it only needs to use functionality provided by it.
    /// This allows the slideshow plugin to be used by any application that uses the plugin framework even if they completely replace the PluginDemo structure
    /// with something very different.  As long as the core BaseMvcPlugin structure stays the same, this plugin should function properly.</remarks>
    [Export(typeof(Kusog.Mvc.IMvcPlugin))]
    [MvcPluginMetadata("ksgSlideshow", null, "Slideshow Plugin", "Advanced slideshow player with editor.")]
    public class SlideshowPlugin : BaseMvcPlugin
    {
        public override void SetupExtensions(IMvcPluginApplication app)
        {
            base.SetupExtensions(app);
            addLocalCss("/Content/syrinx.slideshow.css");
            addFooterScript("ksgSlideshow", "/Scripts/jquery.syrinx-slideshow.js", null);
            addFooterScript("ksgSsControllers", "/Scripts/jquery.syrinx-slideshow-controllers.js", new string[]{"ksgSlideshow"});
            addFooterScript("ksgSsEditor", "/Scripts/jquery.syrinx-slideshow-editor.js", new string[] { "ksgSlideshow" });
            addFooterScript("ksgSsEditor", "/Scripts/jquery.syrinx-slideshow-startup.js", new string[] { "ksgSlideshow" });
            DefineWidget(new Widget("SyrinxSlideshow", "Syrinx Slideshow", "SlideShow", "GetSlideShowHtml"));
        }
    }
}
