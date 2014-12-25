(function ($) {
    function asNum(val) {
        return Math.round(val.replace(/[^\d\.\-]/g, ""));
    }
    function getPosition($el) {
        return { left: asNum($el.css("left")), top: asNum($el.css("top")) };
    }

    function SyrinxSlider(element, options) {
        var posAbsolute = {position:"absolute"};
        var self = this;
        self.$el = $(element);
        self.sTran = self.sAnimi = true;
        self.isActive = true;

        self.numBiggerTic = 0;
        self.timings = [];
        self.slideTimers = [];
        self.numOffAnimi = 0;

        self.$parent = $(element).mouseenter(function () {
            self.mouseInside = true;
        }).mouseleave(function () {
            self.mouseInside = false;
        });

        self.$slides = self.$parent.find(".ksg-slide");
        var op = self.options = $.extend({}, self.defaultOptions, self.getObject(self.$el.data("slideOptions")), options);

        $(window).resize(function () {
            self._resize();
        }).focus(function () {
            //console.log("focus");
            self.setIsActive(true);
        }).blur(function () {
            //console.log("blur");
            self.setIsActive(false);
        });

        self.$images = self.$parent.find(".ksg-slide > img").css(posAbsolute).wrap("<div class='ksg-slide-image' style='position:absolute'></div>");
        self.$parent.find(".ksg-slide-layer").css({ position: "absolute", display: "none" });
        self.$slides.css({ position: "absolute", overflow: "hidden",left:"-10000px" });
        self.$parent.css({ overflow: "hidden", position: "relative" });
        self.refresh(false);

        self.$images.imagesLoaded(function () {
            var $fimg = self.$images.eq(0);
            var $slide = $fimg.parent().parent();
            var dir = $slide.data("bgSlideDir");
            self.setupPos($fimg, dir);
            self.index = 0;

            function afterTic() {
                var oldI = self.index;

                if (self.nextIndex != null)
                    self.index = self.nextIndex;
                else if (self._loopSlide != true && ++self.index >= self.$images.length)
                    self.index = 0;
                self.nextIndex = null;

                var $nimg = self.$images.eq(self.index);
                if(self.$oimg != null)
                    self.$oimg.parent().parent().css("left", "-10000px");

                self.$oimg = self.$images.eq(oldI);
                $slide = $nimg.parent().parent();
                self.hideSlideLayers(self.$oimg.parent().parent());
                self._setCurrentSlide($slide);
                dir = $slide.data("bgSlideDir");

                self.setupPos($nimg, dir);
                self.calcShouldDo();
                var animi = self.shouldTransition();
                var useTransition = !(self.isPaused || self._loopSlide);
                if (useTransition && animi && op.slideTransition == "fade") {
                    self.$oimg.parent().fadeOut(op.transitionTime, function () { $(this).css({ left: "-10000px" }) });
                    $nimg.parent().hide().fadeIn(op.transitionTime);
                }
                else if (useTransition && animi && op.slideTransition == "selfFade") {
                    if(self.shouldTransition())
                        $nimg.parent().css({ opacity: 0 });
                    else
                        self.$oimg.parent().parent().css({ left: "-10000px" })
                }
                else {
                    $nimg.parent().css({ opacity: 1 });
                    if(self.$oimg.get(0) != $nimg.get(0))
                        self.$oimg.parent().parent().css({ left: "-10000px" });
                }
                if(!self.isPaused)
                    self.animateSlideLayers($nimg.parent().parent());

                self.tic($nimg, dir, afterTic);
            }
            self._setCurrentSlide($slide);
            self.animateSlideLayers($slide);
            self.tic($fimg, dir, afterTic);
            self.$el.trigger("slider.starting");
        });
    }

    SyrinxSlider.prototype = {
        defaultOptions: {
            overSize: .25,
            timePerSlide: 7000,
            transitionTime: 2000,
            frameSpeed: 50,
            sizeToWindow: true,
            slideTransition: "selfFade",
            doAnimation: true,
            autoDegrade: true

        },

        getOptions: function () {
            return this.options;
        },

        _setCurrentSlide: function($slide) {
            var self = this;
            self.$el.trigger("slider.slideChange", [self.index, self.$currentSlide, $slide]);
            self.$currentSlide = $slide;
            return $slide;
        },

        getCurrentSlide: function () {
            return this.$currentSlide;
        },

        _resize: function () {
            var self = this;
            if (self.options.sizeToWindow == true) {
                self.sTran = self.sAnimi = true;
                self.numOffAnimi = 0;
                self.timings = [];
                self.$images.each(function () {
                    if ($(this).parent().parent().css("left") != "-10000px")
                        self.doSizing($(this));
                });
            }
            else {
                //self.$parent.css({ width: "", height: "" });
                self.$images.each(function () {
                    self.doSizing($(this));
                });
            }
        },

        refresh: function () {
            var self = this;
            self.$slides = self.$parent.find(".ksg-slide");
            self.$images = self.$parent.find(".ksg-slide-image > img");
            var fullScreen = self.options.sizeToWindow;
            if (fullScreen)
                self.$el.css({ position: "fixed", left: "0px", top: "0px" }).addClass("fullScreen");
            else
                self.$el.css({ position: "relative" }).removeClass("fullScreen");
            self._resize();
            self.$el.trigger("slider.refresh");
        },

        hideSlideLayers: function ($slide) {
            for (var i in this.slideTimers)
                clearTimeout(this.slideTimers[i]);
            this.slideTimers = [];
            $slide.find(".ksg-slide-layer").stop().hide().each(function () {
                $(this).data("clone", null);
            });
            $slide.find(".ksg-layer-clone").remove();
        },

        animateSlideLayers: function ($slide) {
            var self = this;
            $slide.find(".ksg-slide-layer").each(function (index, layer) {
                var timeout = $(layer).data("delay");
                if(timeout == null)
                    timeout = 0;
                self.slideTimers.push(setTimeout(function () {
                    var $clone = $(layer).clone(true);
                    $(layer).data("clone", $clone);
                    self.animateNextLayerCss($clone.addClass("ksg-layer-clone").insertAfter($(layer)), 1);
                }, timeout));
            });
        },

        animateNextLayerCss: function ($layer, pos, lastPos) {
            var self = this, $path = self.$parent.find("." + $layer.data("layerPath"));
            if ($path.length == 0)
                $path = $layer;

            if (self.isPaused)
                return;

            var layerDelay = $path.data("delay" + (lastPos?lastPos:pos));
            layertDelay = layerDelay == null ? 0 : parseInt(layerDelay);
            var animiTime = $path.data("animiTime" + (lastPos?lastPos:pos));
            animiTime = (animiTime == null || animiTime == "") ? 5000 : parseInt(animiTime);

            if (pos == 1 && lastPos == null)
                $layer.show().css(self.getObject($path.data("css" + pos)));
            var nextCss = self.getObject($path.data("css" + (pos + 1)));
            if (nextCss) {
                //console.log("css-top:" + nextCss.top + " - pos:" + pos);
                var trans = "";
                var tstate = null;
                var x = $layer.animate(nextCss, {
                    duration: animiTime,
                    complete: function () {
                        self.animateNextLayerCss($layer, pos + 1);
                    },
                    step: function (now, fx) {
                        var transform = function (val) {
                            if (tstate != fx.pos) {
                                trans = "";
                                tstate = fx.pos;
                            }
                            trans += " " + val;
                            return { 'transform': trans, 'ms-transform': trans, 'webkit-transform': trans, '-moz-transform': trans, '-o-transform': trans };
                        }
                        if (fx.prop == "ksgRotate")
                            $layer.css(transform("rotate(" + fx.now + "deg)"));
                        if (fx.prop == "ksgScale")
                            $layer.css(transform("scale(" + fx.now + "," + fx.now + ")"));
                        if (fx.prop == "ksgRotateX")
                            $layer.css(transform("rotateX(" + fx.now + "deg)"));
                        if (fx.prop == "ksgRotateY")
                            $layer.css(transform("rotateY(" + fx.now + "deg)"));
                        if (fx.prop == "ksgScaleX")
                            $layer.css(transform("scaleX(" + fx.now + ")"));
                        if (fx.prop == "ksgScaleY")
                            $layer.css(transform("scaleY(" + fx.now + ")"));
                    }
                });
            }
            else if ($path.data("loop") == true)
                self.animateNextLayerCss($layer, 0, pos);

        },

        getObject: function (css) {
            if(typeof(css) == "string")
                return (css != null && css.length != 0) ? eval("(" + css + ")") : null;
            return css;
        },

        setIsActive: function (isIt) {
            if (isIt && !this.isActive)
                this.justActivated = true;            
            this.isActive = isIt;
        },

        calcShouldDo: function() {
            var o = this.options;

            if (this.sTran != false)
                this.sTran = o.doAnimation == true && (!o.autoDegrade || this.timings.length < 50 || this.runningSpeed() < 15);
            var oldAnimi = this.sAnimi;
            this.sAnimi = o.doAnimation == true && (!o.autoDegrade || this.timings.length < 50 || this.runningSpeed() < 35);
            if (!oldAnimi && this.sAnimi)
                if (++this.numOffAnimi > 1)
                    this.sAnimi = false;

        },

        shouldTransition: function () {
            return this.sTran == true;
        },

        shouldAnimate: function () {
            return this.sAnimi == true;
        },

        getNewImgSize: function ($img, ws, is, dir,sizeupInner) {
            var nw, nh, options = this.options;
            var $innerParent = $img.parent();
            var hasHorz = dir.has("left") || dir.has("right");
            var hasVert = dir.has("top") || dir.has("bottom")

            $img.css({ "top": "0px", "left": "0px" });
            if (hasHorz) {
                nw = ws.width + (ws.width * options.overSize);
                nh = (is.height * nw) / is.width;
                var dheight = ws.height;
                if (hasVert || dir.has("in"))
                    dheight += ws.height * options.overSize;
                if(sizeupInner)
                    $innerParent.width(nw).height(dheight);
                if (nh < dheight) {
                    nh = dheight;
                    nw = (is.width * nh) / is.height;
                }
            }
            else {
                nh = ws.height + (ws.height * options.overSize);
                nw = (is.width * nh) / is.height;
                var dwidth = ws.width;
                if (hasHorz || dir.has("in"))
                    dwidth += ws.width * options.overSize;
                if(sizeupInner)
                    $innerParent.height(nh).width(dwidth);
                if (nw < dwidth) {
                    nw = dwidth;
                    nh = (is.height * nw) / is.width;
                }
            }
            if (sizeupInner) {
                var t3, l3;
                if (nh > this.$parent.height())
                    $img.css("top", t3 = Math.round(($innerParent.height() - nh) / 2));
                if (nw > this.$parent.width())
                    $img.css("left", l3 = Math.round(($innerParent.width() - nw) / 2));
                //console.log("t3=" + t3 + " - l3=" + l3);
            }
            var newSize = { height: Math.round(nh), width: Math.round(nw) };
            //console.log("NewSize: (" + newSize.width + "," + newSize.height + ")");
            return newSize;
        },

        sizeupForImage: function ($img, targetSize, dir) {
            if (dir == null)
                dir = "";
            var $parent = $img.parent();
            var ws = { height: $parent.height(), width: $parent.width() };
            if (targetSize)
                ws = targetSize;
            var is = { height: $img.height(), width: $img.width() },
                ns = this.getNewImgSize($img, ws, is, dir,false);
            $img.width(ns.width).height(ns.height);
        },

        doSizing: function ($img) {
            var $parent = this.$parent;
            var ws = { height: $parent.height(), width: $parent.width() };
            if (this.options.sizeToWindow == true) {
                ws = { height: $(window).height(), width: $(window).width() };
                $parent.width(ws.width).height(ws.height);
            }
            $img.parent().parent().css({ width: $parent.width(), height: $parent.height() });
            $img.css({ width: "", height: "" });
            var is = { height: $img.height(), width: $img.width() },
                dir = $img.parent().parent().data("bgSlideDir"),
                ns = this.getNewImgSize($img, ws, is, dir?dir:"", true);
            $img.width(ns.width).height(ns.height);
        },

        saveTiming: function (timing) {
            if (this.isActive) {
                if (this.justActivated) {
                    this.justActivated = false;
                    return;
                }
                if (this.timings.length > 500)
                    this.timings.shift();
                this.timings.push(timing);
            }
        },
        calcAvg: function () {
            var total = 0;
            for (var p = 0; p < this.timings.length; p++)
                total += this.timings[p];
            return total / this.timings.length;
        },
        runningSpeed: function () {
            return (((this.calcAvg() * 100) / this.options.frameSpeed) - 100);
        },

        diag: function(curTime) {
            if (this.lastTime) {
                var sinceLast = curTime - this.lastTime;
                this.saveTiming(sinceLast);
                $("#log").html(
                    "Time:" + new String(sinceLast) +
                    "<br/>avg:" + this.calcAvg().toFixed(2) +
                    "<br/>s:" + this.runningSpeed().toFixed(1) + "%" + 
                    "<br/>size:" + this.$parent.width() + "x"+this.$parent.height()
                );
            }

            this.lastTime = curTime;
        },

        tic: function ($img, dir, onDone, startTime, startI, curI) {
            var self = this, options = self.options,
                $innerParent = $img.parent(),
                done = self.nextIndex == null ? false : true;

            if (startTime == null)
                startTime = new Date().getTime();
            if (startI == null)
                startI = curI = 0;

            var curTime = new Date().getTime();
            if (self.isPaused)
                startTime += curTime - self.lastTime;
            var slideTic = curTime - startTime;
            self.diag(curTime);
            if (!done && !self.isPaused && slideTic < options.timePerSlide) {
                done = false;
                self.$el.trigger("slider.slideTic", (slideTic*100)/options.timePerSlide);
                var p = getPosition($innerParent);
                var keepAnimating =
                    (!dir.has("left") || (dir.has("left") && p.left < 0)) &&
                    (!dir.has("right") || (dir.has("right") && (p.left > self.$parent.width() * -options.overSize))) &&
                    (!dir.has("top") || (dir.has("top") && p.top < 0)) &&
                    (!dir.has("bottom") || (dir.has("bottom") && (p.top > self.$parent.height() * -options.overSize)));

                if (keepAnimating && self.shouldAnimate()) {
                    if (dir.has("left")) {
                        $innerParent.css("left", p.left + 1);
                    }
                    else if (dir.has("right")) {
                        $innerParent.css("left", (p.left - 1));
                    }

                    if (dir.has("top")) {
                        $innerParent.css("top", p.top + 1);
                    }
                    else if (dir.has("bottom")) {
                        $innerParent.css("top", p.top - 1);
                    }

                    if (dir.has("out")) {
                        this.scaleImage($img, 1, dir);
                    }
                    else if (dir.has("in")) {
                        this.scaleImage($img, -1, dir);
                    }

                    var p2 = getPosition($innerParent);

                    if (options.slideTransition == "selfFade" && self.shouldTransition()) {
                        var opac = Number($innerParent.css("opacity"));
                        if (opac < 1.0)
                            $innerParent.css("opacity", opac + .03);
                        if (self.$oimg) {
                            opac = Number(self.$oimg.parent().css("opacity"));
                            if (opac > 0) {
                                opac = Math.round(opac * 1000) / 1000;
                                self.$oimg.parent().css("opacity", opac - .025 < 0 ? 0 : opac - .025);
                            }
                        }
                    }

                }
            }
            else if (!self.isPaused)
                done = true;

            if (self.nextIndex || (done && !(options.pauseWhileMouseInSlide == true && self.mouseInside)))
                onDone();
            else
                setTimeout(function () { self.tic($img, dir, onDone, startTime, startI, ++curI); }, options.frameSpeed);
        },

        scaleImage: function ($img, w, dir) {
            var iw = $img.width(), ih = $img.height();
            return $img.css({
                width: iw + w,
                height:""
                /*height: (ih * (iw + w)) / iw */
            });
        },

        setupPos: function ($img, dir) {
            var self = this, options = this.options;
            var $innerParent = $img.parent();
            this.doSizing($img);
            $innerParent.parent().css({ left: "0px"});
            if (dir.has("left"))
                $innerParent.css({ left: self.$parent.width() * -options.overSize, top: "0px" });
            else if (dir.has("right"))
                $innerParent.css({ left: "0px", top:"0px" });
            if (dir.has("top"))
                $innerParent.css({ top: self.$parent.height() * -options.overSize });
            else if (dir.has("bottom"))
                $innerParent.css({ top: "0px"});
            if (!dir.has("left") && !dir.has("right"))
                $innerParent.css("left", "0px");
        },

        moveNext: function () {
            this.nextIndex = this.index +1;
            if (this.nextIndex == this.$images.length)
                this.nextIndex = 0;
        },

        movePrev: function () {
            this.nextIndex = this.index - 1;
            if (this.nextIndex == -1)
                this.nextIndex = this.$images.length - 1;
        },

        moveTo: function (index) {
            if(this.index != index)
                this.nextIndex = index;
        },

        pause: function () {
            this.isPaused = true;
            window.isPaused = this.isPaused;
        },

        play: function () {
            this.isPaused = false;
            window.isPaused = this.isPaused;
        },

        shuttleTo: function (currentSlideMS) {
        },

        loopSlide: function (loop) {
            if (loop != null)
                this._loopSlide = loop ? true : false;
            return this._loopSlide ? true : false;
        }
    };

    $.fn.syrinxSlider = function (op) {
        var passed = Array.prototype.slice.call(arguments, 1);
        var rc = this;
        this.each(function () {
            var plugin = $(this).data('syrinxSlider');
            if (undefined === plugin) {
                var $el = $(this);
                plugin = new SyrinxSlider(this, op);
                $el.data('syrinxSlider', plugin, this.href);
            }
            else if (plugin[op]) {
                rc = plugin[op].apply(plugin,passed);
            }
        });
        return rc;
    }

    $.fn.imagesLoaded = function (callback) {
        var elems = this.filter('img'),
            len = elems.length,
            blank = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

        elems.bind('load.imgloaded', function () {
            if (--len <= 0 && this.src !== blank) {
                elems.unbind('load.imgloaded');
                callback.call(elems, this);
            }
        }).each(function () {
            // cached images don't fire load sometimes, so we reset src.
            if (this.complete || this.complete === undefined) {
                var src = this.src;
                // webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
                // data uri bypasses webkit log warning (thx doug jones)
                this.src = blank;
                this.src = src;
            }
        });

        return this;
    };

    String.prototype.has = function (str) {
        return this.indexOf(str) != -1;
    }

})(jQuery);
