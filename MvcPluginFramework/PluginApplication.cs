using Syrinx2;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Kusog.Mvc
{
    public class PluginApplication: BaseMvcPluginApplication
    {
        public enum AppResourceTypes { HeaderIncPre, HeaderIncPost, FooterInc, Widget, MenuItem };
        protected PluginApplication(object bundles)
            : base(bundles)
        {
        }

        public static PluginApplication SetupApplication(object bundles)
        {
            PluginApplication me = new PluginApplication(bundles);
            return me;
        }

        #region Plugin Menu Support
        public class PluginMenuItem
        {
            public IMvcPlugin Plugin { get; set; }
            public IBasicMenuItem MenuItem { get; set; }
            public string[] Views { get; set; }
            public string MenuName { get; set; }
            public string MenuLocation { get; set; }
        }


        public Dictionary<PluginMenuItem, string> m_registeredMenuItems = new Dictionary<PluginMenuItem, string>();
        public void registerMenuItem(string menuName, string location, IBasicMenuItem item, IMvcPlugin plugin, string[] views)
        {
            if (string.IsNullOrWhiteSpace(menuName))
                menuName = "main";

            if (views == null || views.Length == 0)
                views = new string[] { "*" };

            lock (m_registeredMenuItems)
            {
                m_registeredMenuItems.Add(new PluginMenuItem() { Plugin = plugin, MenuItem = item, Views = views, MenuLocation = location, MenuName = menuName }, location);
            }
        }

        /// <summary>
        /// Called by a view that has a syrinx menu that it wants the application to populate
        /// </summary>
        /// <param name="menu"></param>
        /// <param name="viewName"></param>
        public void addMenuItems(Syrinx2.MvcMenu menu, string menuName, string viewName)
        {

            foreach (KeyValuePair<PluginMenuItem, string> kvp in m_registeredMenuItems)
            {
                if ((kvp.Key.Views.Contains("*") || kvp.Key.Views.Contains(viewName)) && 
                    string.Compare(kvp.Key.MenuName, menuName, true) == 0 && 
                    ShouldIncludeResource(AppResourceTypes.MenuItem, kvp.Key.Plugin, kvp.Key.MenuItem))
                {
                    string[] n = kvp.Value.Split('/');
                    List<IBasicMenuItem> items = menu.Items;
                    foreach (string piece in n)
                    {
                        bool matched = false;
                        foreach (IBasicMenuItem mi in items)
                        {
                            if (matched = (mi is IMenuItem && string.Compare(mi.ID, piece, true) == 0))
                            {
                                items = ((IMenuItem)mi).Items;
                                break;
                            }
                        }
                        if (!matched)
                        {
                            MenuItem newMi = new MenuItem() { ID = piece, Text = piece };
                            items.Add(newMi);
                            items = newMi.Items;
                        }
                    }
                    items.Add(kvp.Key.MenuItem);
                }
            }
        }
        #endregion

        public static new PluginApplication Instance 
        { 
            get { return BaseMvcPluginApplication.Instance as PluginApplication; } 
            //set { BaseMvcPluginApplication.Instance = value; } 
        }


        protected override bool shouldIncludeResourceCore(BaseMvcPluginApplication.ResourceTypes type, IMvcPlugin plugin)
        {
            return ShouldIncludeResource((AppResourceTypes)type, plugin, null);
        }

        protected virtual bool ShouldIncludeResource(AppResourceTypes type, IMvcPlugin plugin, object resource)
        {
            bool should = true;
            if (plugin != null)
            {
                if (should && plugin is BaseMvcPlugin)
                    should = ((BaseMvcPlugin)plugin).ShouldIncludeResource(type, resource);
            }

            return should;
        }
    }
}
