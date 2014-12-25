using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;
using System.Web.Routing;

namespace Kusog.Mvc
{
    /// <summary>
    /// 插件控制器工厂。
    /// </summary>
    public class PluginControllerFactory : DefaultControllerFactory
    {
        /// <summary>
        /// 根据控制器名称及请求信息获得控制器类型。
        /// </summary>
        /// <param name="requestContext">请求信息</param>
        /// <param name="controllerName">控制器名称。</param>
        /// <returns>控制器类型。</returns>
        protected override Type GetControllerType(RequestContext requestContext, string controllerName)
        {
            //如果插件shi直接放入bin目录中，这句并不需要直接调用基类的base.GetControllerType方法就能找到
            Type controllerType = this.GetControllerType(controllerName);

            if (controllerType == null)
            {
                controllerType = base.GetControllerType(requestContext, controllerName);
                return controllerType;
            }

            return controllerType;
        }

        /// <summary>
        /// 根据控制器名称获得控制器类型。
        /// </summary>
        /// <param name="controllerName">控制器名称。</param>
        /// <returns>控制器类型。</returns>
        private Type GetControllerType(string controllerName)
        {
            foreach (Lazy<IMvcPlugin, IMvcPluginData> plugin in PluginApplication.Instance.Plugins)
            {
                if (plugin.Value.ControllerTypes.ContainsKey(controllerName))
                    return plugin.Value.ControllerTypes[controllerName];
            }

            return null;
        }
    }
}
