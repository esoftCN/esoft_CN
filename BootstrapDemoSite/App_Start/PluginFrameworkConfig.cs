using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Optimization;

using Kusog.Mvc;

namespace BootstrapDemoSite
{
    public class PluginFrameworkConfig
    {
        public static void SetupAppFramework(BundleCollection bundles)
        {
            PluginApplication.SetupApplication(bundles);
            PluginApplication.Instance.defineWidgetContainer(new WidgetContainer("rightSidebar",
                new WidgetContainer.WidgetDetails("SimpleWidget"), new WidgetContainer.WidgetDetails("SimpleWidget2")));
        }
    }
}