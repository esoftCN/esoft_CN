//Copyright 2012-2013 Kusog Software, inc. (http://kusog.org)
//This file is part of the ASP.NET Mvc Plugin Framework.
// == BEGIN LICENSE ==
//
// Licensed under the terms of any of the following licenses at your
// choice:
//
//  - GNU General Public License Version 3 or later (the "GPL")
//    http://www.gnu.org/licenses/gpl.html
//
//  - GNU Lesser General Public License Version 3 or later (the "LGPL")
//    http://www.gnu.org/licenses/lgpl.html
//
//  - Mozilla Public License Version 1.1 or later (the "MPL")
//    http://www.mozilla.org/MPL/MPL-1.1.html
//
// == END LICENSE ==
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Web.WebPages.Razor;

namespace Kusog.Mvc
{
    public class PluginRazorViewEngine : System.Web.Mvc.RazorViewEngine
    {
        public delegate bool VirtualPathHandler(ref string virtualPath);
        protected List<VirtualPathHandler> m_handlers = new List<VirtualPathHandler>();

        public PluginRazorViewEngine(bool findPlugins)
        {
            if (findPlugins)
                setupViewLocations(BaseMvcPluginApplication.Instance.RazorViewLocations);
        }

        public PluginRazorViewEngine(List<string> viewLocations, bool findPlugins) 
            : base() 
        {
            setupViewLocations(viewLocations);
            if (findPlugins)
                setupViewLocations(BaseMvcPluginApplication.Instance.RazorViewLocations);
        }

        public void setupViewLocations(List<string> viewLocations)
        {
            string[] tempArray = new string[ViewLocationFormats.Length + viewLocations.Count];
            ViewLocationFormats.CopyTo(tempArray, 0);

            for (int i = 0; i < viewLocations.Count; i++)
            {
                tempArray[ViewLocationFormats.Length + i] = viewLocations[i];
            }

            ViewLocationFormats = tempArray;

            PartialViewLocationFormats = ViewLocationFormats;
        }

        public void registerVirtualPathHandler(VirtualPathHandler handler)
        {
            m_handlers.Add(handler);
        }

        private bool IsAppResourcePath(string virtualPath) 
        {
            string vpath = calculateVirtualPath(virtualPath);
            String checkPath = VirtualPathUtility.ToAppRelative(vpath);
            return checkPath.StartsWith("~/Plugins/", StringComparison.InvariantCultureIgnoreCase);
        }

        /// <summary>
        /// 搜索部分视图页。
        /// </summary>
        /// <param name="controllerContext"></param>
        /// <param name="partialViewName"></param>
        /// <param name="useCache"></param>
        /// <returns></returns>
        public override ViewEngineResult FindPartialView(ControllerContext controllerContext, string partialViewName, bool useCache)
        {
            string pluginName = string.Empty;

            if (controllerContext.RouteData.Values.ContainsValue(partialViewName))
            {
                var key = controllerContext.RouteData.Values.First(kv => kv.Value == partialViewName).Key;
                pluginName = controllerContext.RouteData.GetRequiredString(key);
                this.CodeGeneration(pluginName);
            }

            return base.FindPartialView(controllerContext, partialViewName, useCache);
        }

        public override ViewEngineResult FindView(ControllerContext controllerContext, string viewName, string masterName, bool useCache)
        {
            string pluginName = string.Empty;

            if (controllerContext.RouteData.Values.ContainsValue(viewName))
            {
                var key = controllerContext.RouteData.Values.First(kv => kv.Value == viewName).Key;
                pluginName = controllerContext.RouteData.GetRequiredString(key);
                this.CodeGeneration(pluginName);
            }

            return base.FindView(controllerContext, viewName, masterName, useCache);
        }

        //If we have a virtual path, we need to override the super class behavior,
        //its implementation ignores custom VirtualPathProviders, unlike the super's super class. 
        //This code basically just reimplements the super-super class (VirtualPathProviderViewEngine) behavior for virtual paths.
        protected override bool FileExists(ControllerContext controllerContext, string virtualPath) 
        {
            string vpath = calculateVirtualPath(virtualPath);
            if (IsAppResourcePath(vpath))
            {
                return System.Web.Hosting.HostingEnvironment.VirtualPathProvider.FileExists(vpath);
            }
            else
                return base.FileExists(controllerContext, vpath);
        }

        //TODO: Expand this to allow registered deligates a chance to manipulate the virtualPath.
        //NOTE: Multiple requests are made to this method per client request.
        protected virtual string calculateVirtualPath(string virtualPath)
        {
            string calcPath = virtualPath;

            foreach (VirtualPathHandler handler in m_handlers)
            {
                if (handler(ref calcPath))
                    break;
            }

            return calcPath;
        }

        /// <summary>
        /// 给运行时编译的页面加了引用程序集。
        /// 原因：在编译view时由于view中存在对程序集的引用，如：@using PluginDemo，
        /// 因此需要为这个被编译的页面提供引用程序集 
        /// </summary>
        /// <param name="pluginName"></param>
        private void CodeGeneration(string pluginName)
        {
            RazorBuildProvider.CodeGenerationStarted += (object sender, EventArgs e) =>
            {
                RazorBuildProvider provider = (RazorBuildProvider)sender;
                Assembly assembly = null;                
                foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in PluginApplication.Instance.Plugins)
                {
                    assembly = plugin.Value.Assembly;
                    provider.AssemblyBuilder.AddAssemblyReference(assembly);
                }
            };
        }
    }
}
 