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
using System.Collections.ObjectModel;
using System.ComponentModel.Composition;
using System.ComponentModel.Composition.Hosting;
using System.IO;
using System.Reflection;
using System.Text;
using System.Web;
using System.Web.Hosting;
using System.Web.Optimization;

using System.Web.Mvc;
using System.Web.Mvc.Html;


namespace Kusog.Mvc
{
    public class BaseMvcPluginApplication : IMvcPluginApplication
    {
        public enum ResourceTypes { HeaderIncPre, HeaderIncPost, FooterInc, Widget };
        protected static string WidgetContainerCssClassName = "pmvc-widget-container";
        protected static string WidgetCssClassName = "pmvc-widget-box";
        public static BaseMvcPluginApplication Instance 
        { 
            get { return HttpContext.Current.Application["pluginApp"] as BaseMvcPluginApplication; } 
            private set { HttpContext.Current.Application["pluginApp"] = value; } 
        }

        [ImportMany]
        public IEnumerable<Lazy<IMvcPlugin, IMvcPluginData>> Plugins { get; private set; }
        protected CompositionContainer PluginsContainer { get; private set; }
        public BundleCollection Bundles { get; private set; }
        public PluginRazorViewEngine RazorEngine { get; private set; }
        public List<string> RazorViewLocations
        {
            get
            {
                List<string> views = new List<string>();
                foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
                {
                    views.AddRange(plugin.Value.RazorViewLocations);
                }
                AddAdditionalRazorViewLocations(views);

                return views;
            }
        }
        public string HeaderIncludesPost
        {
            get
            {
                StringBuilder buff = new StringBuilder();

                foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
                {
                    string name = plugin.Metadata.Name;
                    if (shouldIncludeResource(ResourceTypes.HeaderIncPost, plugin.Value))
                        plugin.Value.getHeaderResourcesPost(buff);
                }
                AddAdditionalHeaderIncludePost(buff);

                return buff.ToString();
            }
        }
        public string FooterIncludes
        {
            get
            {


                StringBuilder buff = new StringBuilder();

                foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
                {
                    string name = plugin.Metadata.Name;
                    if (shouldIncludeResource(ResourceTypes.FooterInc, plugin.Value))
                        plugin.Value.getFooterResources(buff);
                }
                AddAdditionalFooterIncludes(buff);

                return buff.ToString();
            }
        }
        public string HeaderIncludesPre
        {
            get
            {
                StringBuilder buff = new StringBuilder();

                foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
                {
                    string name = plugin.Metadata.Name;
                    if (shouldIncludeResource(ResourceTypes.HeaderIncPre, plugin.Value))
                        plugin.Value.getHeaderResourcesPre(buff);
                }
                AddAdditionalHeaderIncludesPre(buff);
                return buff.ToString();
            }
        }

        #region --- Widget Support --------------------------------------------------------------------------------------
        protected Dictionary<string, WidgetContainer> m_widgetContainers = new Dictionary<string, WidgetContainer>();
        public IDictionary<string, WidgetContainer> WidgetContainers { get { return new ReadOnlyDictionary<string, WidgetContainer>(m_widgetContainers); } }

        public void defineWidgetContainer(WidgetContainer container)
        {
            if (!m_widgetContainers.ContainsKey(container.Id))
            {
                m_widgetContainers[container.Id] = container;
            }
        }
        public void renderWidgetContainer(string containerId, HtmlHelper html)
        {
            WidgetContainer container = null;
            if (m_widgetContainers.TryGetValue(containerId, out container) && container.Widgets.Count > 0)
            {
                html.ViewContext.Writer.WriteLine("<div class='{0}'>", BaseMvcPluginApplication.WidgetContainerCssClassName);
                container.Widgets.ForEach(w => renderWidget(html, w.WidgetId, w.WidgetOptions));
                //foreach (WidgetContainer.ContainerWidget w in container.Widgets)
                //    renderWidget(html, w.WidgetId, w.WidgetOptions);
                html.ViewContext.Writer.WriteLine("</div>");
            }
        }
        public void renderWidgetList(HtmlHelper html, params WidgetContainer.WidgetDetails[] widgets)
        {
            foreach (WidgetContainer.WidgetDetails widge in widgets)
                renderWidget(html, widge.WidgetId, widge.WidgetOptions);
        }

        public void renderWidget(HtmlHelper html, string widgetId, object widgetOptions = null)
        {
            foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
            {
                string name = plugin.Metadata.Name;
                foreach(Widget widg in plugin.Value.Widgets)
                    if (string.Compare(widg.Id, widgetId, true) == 0)
                    {
                        renderWidget(html, plugin.Value, widg, widgetOptions);
                        return;
                    }                            
            }
        }

        /// <summary>
        /// Child classes can override this method to add wrapper markup before the widget is rendered.
        /// </summary>
        /// <param name="html"></param>
        /// <param name="widget"></param>
        protected virtual void preRenderWidget(HtmlHelper html, IMvcPlugin plugin, Widget widget)
        {
            html.ViewContext.Writer.WriteLine("<div class='{0}'>",BaseMvcPluginApplication.WidgetCssClassName);
        }

        /// <summary>
        /// Child classes can override this method to add wrapper markup after the widget is rendered.
        /// </summary>
        /// <param name="html"></param>
        /// <param name="widget"></param>
        protected virtual void postRenderWidget(HtmlHelper html, IMvcPlugin plugin, Widget widget)
        {
            html.ViewContext.Writer.WriteLine("</div>");
        }

        protected virtual void renderWidget(HtmlHelper html, IMvcPlugin plugin, Widget widget, object widgetOptions)
        {
            if (shouldIncludeResource(ResourceTypes.Widget, plugin))
            {
                preRenderWidget(html, plugin, widget);
                html.RenderAction(widget.Action, widget.Controller, widgetOptions);
                postRenderWidget(html, plugin, widget);
            }
        }
        #endregion -----------------------------------------------------------------------------------------------------

        protected BaseMvcPluginApplication(object bundles)
        {
            //Setting Instance here is done in order to make sure the Instance is available during construction.
            Instance = this;

            this.Bundles = bundles as BundleCollection;
            HostingEnvironment.RegisterVirtualPathProvider(new AssemblyResourceProvider());
            refreshPlugins();
            setupViewEngines();
        }

        /// <summary>
        /// Adds the various ways MEF will find assemblies that have plugin parts.  
        /// Child classes can override this to change what is in the catalog.
        /// </summary>
        /// <param name="catalog">An aggregate catalog that combines multiple catalogs</param>
        protected virtual AggregateCatalog addMefCatalogs(AggregateCatalog catalog)
        {
            //设置目录
            //catalog.Catalogs.Add(new DirectoryCatalog(HttpContext.Current.Server.MapPath("~/bin"), "*plugin*.dll"));
            catalog.Catalogs.Add(new DirectoryCatalog(HttpRuntime.BinDirectory, "*plugin*.dll"));
            catalog.Catalogs.Add(new DirectoryCatalog(Path.Combine(HttpRuntime.AppDomainAppPath, "Plugins"), "*plugin*.dll"));

            return catalog;
        }

        /// <summary>
        /// Clears existing registered view engines and adds the mvc plugin razor engine.
        /// </summary>
        /// <remarks>This method does clear out ALL other registered view engines because so far this framework is only
        /// used on projects that use razor only.  If that is an issue for your system, override this method and
        /// setup the view engines the way your system needs them.</remarks>
        protected virtual void setupViewEngines()
        {
            ViewEngines.Engines.Clear();
            ViewEngines.Engines.Add(this.RazorEngine = new PluginRazorViewEngine(true));
        }

        /// <summary>
        /// Uses MEF to get all plugins defined and get them setup for use in the site.
        /// </summary>
        /// <remarks>This code does not attempt to only call SetupExtensions once for a given plugin.  
        /// Each time this method is called, all plugins found will have their SetupExtensions method
        /// called.  This is intended to be called once during application startup.</remarks>
        protected virtual void refreshPlugins()
        {
            try
            {
                AggregateCatalog catalog = new AggregateCatalog();
                addMefCatalogs(catalog);
                this.PluginsContainer = new CompositionContainer(catalog);
                this.PluginsContainer.ComposeParts(this);
            }
            catch (CompositionException compositionException)
            {
                Console.WriteLine(compositionException.ToString());
            }
            catch (ReflectionTypeLoadException ex)
            {
                StringBuilder sb = new StringBuilder();
                foreach (Exception exSub in ex.LoaderExceptions)
                {
                    sb.AppendLine(exSub.Message);
                    if (exSub is FileNotFoundException)
                    {
                        FileNotFoundException exFileNotFound = exSub as FileNotFoundException;
                        if (!string.IsNullOrEmpty(exFileNotFound.FusionLog))
                        {
                            sb.AppendLine("Fusion Log:");
                            sb.AppendLine(exFileNotFound.FusionLog);
                        }
                    }
                    sb.AppendLine();
                }
                string errorMessage = sb.ToString();
                //Display or log the error based on your application.
            }
            foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in this.Plugins)
            {
                plugin.Value.SetupExtensions(this);
            }

        }

        protected void AddAdditionalRazorViewLocations(List<string> lst)
        {
            lst.Add("~/Plugins/PluginDemo/Views.{1}.{0}.cshtml");
            AddAdditionalRazorViewLocationsCore(lst);
        }
        protected virtual void AddAdditionalRazorViewLocationsCore(List<string> lst)
        {
        }

        protected void AddAdditionalHeaderIncludePost(StringBuilder buff)
        {
            AddAdditionalHeaderIncludePostCore(buff);
        }
        protected virtual void AddAdditionalHeaderIncludePostCore(StringBuilder buff)
        {
        }
        protected bool shouldIncludeResource(ResourceTypes type, IMvcPlugin plugin)
        {
            return shouldIncludeResourceCore(type, plugin);
        }
        protected virtual bool shouldIncludeResourceCore(ResourceTypes type, IMvcPlugin plugin)
        {
            return true;
        }

        protected void AddAdditionalHeaderIncludesPre(StringBuilder buff)
        {
            AddAdditionalHeaderIncludesPreCore(buff);
        }
        protected virtual void AddAdditionalHeaderIncludesPreCore(StringBuilder buff)
        {
        }

        protected void AddAdditionalFooterIncludes(StringBuilder buff)
        {
            AddAdditionalFooterIncludesCore(buff);
        }
        protected virtual void AddAdditionalFooterIncludesCore(StringBuilder buff)
        {
        }
    }
}