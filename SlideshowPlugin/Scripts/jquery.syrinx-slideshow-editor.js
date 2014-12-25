(function ($) {
    //Syrinx Slideshow editor jquery plugin
    function SyrinxSlideShowEditor(element, options) {
        var self = this;
        var op = self.options = $.extend({}, self.defaultOptions, options);
        self.element = element;
        self.$el = $(element);

        self.$editBtn = $("<div class='ksg-edit-slideshow'></div>").appendTo($(element))
            .click(function (event) {
                self.editSlideShow();
            });
        $(window).unload(function () {
            if (self.slideShowEditWin)
                self.slideShowEditWin.close();
        });
    }

    $.extend(true, SyrinxSlideShowEditor.prototype, {
        defaultOptions: {
            imgSizePart: "/Large/",
            slideStripSizePart: "/FilmStripCell/",
            jqueryUrl: "http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js",
            jqueryUiUrl: "http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.23/jquery-ui.min.js",
            editorHelpUrl: "http://wordpress.kusog.org/syrinx-slideshow-editor-online-help/",
            thumbSize: { width: 120, height: 100 },
            saveUrl: null,
            slideShowType: "syrinx"
        },

        getOptions: function () {
            return this.options;
        },
        
        _filmStrip: function () {
            return this.$w(".ksg-filmstrip-track");
        },

        _selectedFilmstripEl: function() {
            return this._filmStrip().find(".ksg-slide-filmcell.selected");
        },
        _filmstripEls: function () {
            return this._filmStrip().find(".ksg-slide-filmcell");
        },
        _playerSlideEls: function () {
            return this.$el.find(".ksg-slide");
        },


        setupFilmStrip: function () {
            var self = this,
                $w = this.slideShowEditWin.$,
                $ssbody = $w("body"),
                $horzMove = $w("#horzMove"), $vertMove = $w("#vertMove"), $zoom = $w("#zoom"), $slideImgUrl = $w("#imageUrl"),
                $slides = self._playerSlideEls(),
                didDrop = false,
                $editSlides = self._filmstripEls();

            self._setupFilmStripCell($editSlides);
            $w("#vertMove, #horzMove, #zoom").change(function (event) {
                var h = $horzMove.val(), v = $vertMove.val(), z = $zoom.val();
                self._selectedFilmstripEl().data("origSlideDir",
                    (h != "none" ? h : "") + " " + (v != "none" ? v : "") + " " + (z != "none" ? z : ""));
                self._updateSlideShow();
            });

            $w("#imageUrl").change(function (event) {
                self._selectedFilmstripEl().data("imageUrl", $slideImgUrl.val())
                    .find("img").attr("src", $slideImgUrl.val()).css({width:"",height:""}).imagesLoaded(function () {
                        self._setupFilmstripImgSizes();
                        self._updateSlideShow();
                    });
            });
        },

        setCurrentSlideImage: function (imgurl) {
            var self = this, $w = self.$w;
            self._selectedFilmstripEl().data("imageUrl", imgurl)
                .find("img").attr("src", imgurl).css({ width: "", height: "" }).imagesLoaded(function () {
                    self._setupFilmstripImgSizes();
                    self._updateSlideShow();
                });
            $w("#imageUrl").val(imgurl);
        },

        _setupFilmStripCell: function($editSlides, asSelected) {
            var self = this, $w = self.$w, $ssbody = $w("body"), $slides = self._playerSlideEls();
            var $horzMove = $w("#horzMove"), $vertMove = $w("#vertMove"), $zoom = $w("#zoom"), $slideImgUrl = $w("#imageUrl");

            function setSelectedCell(filmCell) {
                $editSlides = self._filmstripEls();
                $editSlides.removeClass("selected");
                var $editSlide = $w(filmCell).addClass("selected");
                var origIndex = $editSlide.data("origIndex");
                var $slide = $(self.element).find(".ksg-slide").eq(origIndex);
                var slideDir = $editSlide.data("origSlideDir");

                $horzMove.val("none");
                if (slideDir.indexOf("left") != -1)
                    $horzMove.val("left");
                else if (slideDir.indexOf("right") != -1)
                    $horzMove.val("right");

                $vertMove.val("none");
                if (slideDir.indexOf("top") != -1)
                    $vertMove.val("top");
                else if (slideDir.indexOf("bottom") != -1)
                    $vertMove.val("bottom");

                $zoom.val("none");
                if (slideDir.indexOf("in") != -1)
                    $zoom.val("in");
                else if (slideDir.indexOf("out") != -1)
                    $zoom.val("out");

                $slideImgUrl.val($slide.find("img:first")[0].src);
                self.$el.syrinxSlider("moveTo", origIndex);
                self._showSlideLayers($editSlide);
            }

            if(asSelected == true)
                setSelectedCell($editSlides);

            $editSlides.bind("drop", function (event, ui) {
                if (event.originalEvent.dataTransfer) {
                    event.preventDefault();
                    var filmCell = this;
                    if (event.ctrlKey) {
                        var $td = $w(filmCell).parent().clone(true).insertBefore($w(filmCell).parent());
                        filmCell = $td.find(".ksg-slide-filmcell").data("layers", []).data("origIndex", -1).get(0);
                    }
                    setSelectedCell(filmCell);
                    var fileName = event.originalEvent.dataTransfer.getData("text");
                    self.setCurrentSlideImage(fileName);
                }
            }).draggable({
                distance: 10,
                containment: $ssbody.find(".ksg-filmstrip-corearea"),
                axis: "x",
                start: function (e, ui) {
                    didDrop = false;
                    this._oldTd = $w(this).parent();
                    $w(this).css("zIndex", 2000).fadeTo("fast", 0.60);
                },
                stop: function (e, ui) {
                    if (!didDrop) {
                        didDrop = false;
                        $w(this).css({ opacity: 1, left:0 });
                    }
                }
            }).droppable({
                over: function (e, ui) {
                    $w(this).addClass("ksg-slide-drop-filmcell");
                },
                out: function (e, ui) {
                    $w(this).removeClass("ksg-slide-drop-filmcell");
                },
                drop: function (e, ui) {
                    didDrop = true;
                    var tpl = $w(this).parent().position().left;
                    var opl = $w(ui.draggable[0]._oldTd).position().left;
                    if (tpl < opl)
                        $w(ui.draggable[0]._oldTd).insertBefore($w(this).parent());
                    else
                        $w(ui.draggable[0]._oldTd).insertAfter($w(this).parent());
                    $w(this).removeClass("ksg-slide-drop-filmcell");
                    $w(ui.draggable[0]).css({ top: "0px", left: "0px", zIndex: 0 }).fadeTo("fast", 1.0);
                    self._updateSlideShow();
                }
            }).click(function (event) {
                setSelectedCell(this);
            }).each(function (index) {
                var $editSlide = $w(this);
                var $slide = $slides.eq($editSlide.data("origIndex"));
                var layers = [];
                $slide.find(".ksg-slide-layer:not(.ksg-layer-clone)").each(function (index) {
                    var $layer = $(this), $path = $layer,
                        layer = {
                            path: $layer.data("layerPath"),
                            title: $layer.data("layerTitle"),
                            origIndex: index,
                            keyFrames: []
                        };
                    layers.push(layer);
                    var layerPath = $layer.data("layerPath");
                    if (layerPath)
                        $path = self.$el.find("." + layerPath);

                    var pos = 0;
                    var layerTime = Number($path.data("delay"));
                    while (++pos) {
                        var css = $path.data("css" + pos),
                            animiTime = $path.data("animiTime" + pos);

                        if (css) {
                            layer.keyFrames.push({
                                time: layerTime,
                                css: css,
                                origIndex: pos-1
                            });
                        }
                        else
                            break;
                        if (animiTime)
                            layerTime += Number(animiTime);
                    }
                });
                $editSlide.data("layers", layers);
            });
        },

        _slideShowEditHtml: function () {
            return "<div>" +
                    this._slideStripHtml() +
                    "<div class='slide-details-core'>" +
                        "<div class='editor-help' title='view editor help'><a href='" + this.options.editorHelpUrl + "' target='syx_help'>help</a></div>" +
                        "<fieldset id='slideshowDetails'><legend>SlideShow Details</legend>" +
                            "<div class='frameset-buttons'>" +
                                "<button type='button' id='createSlide'>Add Slide</button><button type='button' id='deleteSlide'>Delete Slide</button>" +
                                "<button type='button' id='save' style='margin-right:25px'>Save</button>" +
                                "<button type='button' id='play' style='display:none'>Play</button><button type='button' id='pause'>Pause</button>" +
                                "<span style='position:relative;top:-10px;'><input type='checkbox' id='loopSlide'/><label for='loopSlide'>Loop</label></span>" +
                            "</div>" +
                            "<div>Pause On Mouse In Slide:<input type='checkbox' id='pauseOnMouse'/></div>" +
                            "<div>Size To Window:<input type='checkbox' id='sizeToWindow'/></div>" +
                            "<div>Time Per Slide (in ms):<input type='text' id='slideTime'/></div>" +
                            "<div class='slideshow-size'>Width:<input type='number' id='ssWidth'/>&nbsp; Height:<input type='number' id='ssHeight'/></div>" +
                        "</fieldset>" +
                        "<div class='ksg-slide-details'>" +
                            "<fieldset id='slideDetails'><legend>Slide Details</legend>" +
                                "<div class='slide-move slide-move-horz'>Horizontal:<select id='horzMove'><option value='none'>None</option><option value='left'>Left</option><option value='right'>Right</option></select></div>" +
                                "<div class='slide-move slide-move-vert'>Vertical:<select id='vertMove'><option value='none'>None</option><option value='top'>Top</option><option value='bottom'>Bottom</option></select></div>" +
                                "<div class='slide-move slide-move-zoom'>Zoom:<select id='zoom'><option value='none'>None</option><option value='in'>In</option><option value='out'>Out</option></select></div>" +
                                "<br style='clear:both' />" +
                                "<div class='slide-img-url'>Image Url:<input type='text' id='imageUrl' style='width:80%'></input><button type='button' id='setSlideImg'>Upload</button></div>" +
                            "</fieldset>" +
                        "</div>" +
                        "<fieldset id='slideLayers'><legend>Slide Layers</legend>" +
                            "<div class='frameset-buttons'><button type='button' id='newLayer'>Add</button><button type='button' id='deleteLayer'>Delete</button></div>" +
                            "<div class='layer-details'>" +
                                "<div class='ksg-slide-layers'></div>" +
                                "<div class='layer-keyframes'></div>" +
                            "</div>" +
                        "</fieldset>" +
                        "<fieldset id='keyframeDetails'><legend>Key Frame Details</legend>" +
                            "<div class='frameset-buttons'><button type='button' id='newKeyframe'>Add</button><button type='button' id='cloneKeyframe'>Clone</button><button type='button' id='deleteKeyframe'>Delete</button></div>" +
                            "Css:<input type='text' id='keyframeCss' style='width:400px'></input>" +
                        "</fieldset>" +
                    "</div>" +
                "</div>" +
                this._menusHtml();
        },

        _menusHtml: function () {
            return "";
        },

        _getSlideStripImageUrl: function (imageUrl) {
            return imageUrl.replace(this.options.imgSizePart, this.options.slideStripSizePart);
        },

        _slideStripHtml: function () {
            var self = this, options = self.options;
            var $slides = self._playerSlideEls();

            var html = "<div class='ksg-filmstrip-track'>"
                + "<table cellpadding='0' cellspacing='0' width='100%'><tr><td><div class='ksg-slide-filmstripa'><div class='ksg-slide-filmstripb'><table cellpadding='0' cellspacing='0' class='ksg-filmstrip-corearea'><tr>";
            $slides.each(function (index) {
                html += self._slideStripCellHtml($(this), index);
            });
            html += "</tr></table></div></div></td></tr></table>" +
                "</div>";

            return html;
        },

        _slideStripCellHtml: function ($slide, index) {
            var options = this.options;
            return "<td><div class='ksg-slide-filmcell' data-orig-index='" + index + "' data-orig-slide-dir='" + $slide.data("bgSlideDir") +
            "' style='overflow:hidden;width:" + options.thumbSize.width + "px;height:" + options.thumbSize.height + "px;'><img src='" + this._getSlideStripImageUrl($slide.find("img:first")[0].src) + "' />" +
            "</div></td>";
        },

        _newLayerHtml: function (layer) {
            var title = layer.title,
                css1 = layer.keyFrames[0].css,
                initStyle = 'style="position: absolute; display: none;"',
                animiTime = 2000;

            return "<div class='ksg-slide-layer' data-layer-title='" + title + "' " + initStyle + 
                    " data-fade-out='False' data-delay='0' data-css1=\"" + css1 + "\" data-animi-time1='" + animiTime + "'>" +
                        "New Layer Content" +
                   "</div>";
        },

        _showSlideLayers: function ($slideFilmStrip) {
            var html = "<div class='layer-names'>", self = this;
            if ($slideFilmStrip == null)
                $slideFilmStrip = self._selectedFilmstripEl();

            var layers = $slideFilmStrip.data("layers");
            if (layers) {
                for (var pos = 0; pos < layers.length; pos++) {
                    html += "<div>" +
                        "<input type='text' class='layer-name' value='" + layers[pos].title + "' data-orig-index='" + pos + "'></input></div>";
                }
            }
            else
                layers = [];

            html += "</div>";
            this.$w(".ksg-slide-layers").html(html);

            var slideTime = $(self.element).syrinxSlider("getOptions").timePerSlide;
            this.$w(".layer-keyframes").each(function () {
                $(this).syrinxKeyFrameTimeline({
                    $w: self.slideShowEditWin.$,
                    totalTime: slideTime,
                    timelines: layers
                });
            });
        },

        //This is an object to hold functions that know how to convert what is being edited into the type of slideshow to be generated with.
        slideShowContentGenerator: {
            //This will generate a syrinx slideshow.
            syrinx: function ($ssbody, options) {
                var self = this;
                var html = "<div id='"+ self.$el.attr("id") + "' class='ksg-slide-show' style='width:" + $ssbody.find("#ssWidth").val() + "px;height:" + $ssbody.find("#ssHeight").val() + "px;overflow:hidden;background-color:white;' data-slide-options='" +
                    JSON.stringify(options) +
                    "'>\n";

                function genDiv($el, dataIdChecks, skipAttributes, tag, closed) {
                    var foundData = {};
                    if (!tag)
                        tag = "div";
                    html += "<" + tag;
                    for (var i = 0, attrs = $el[0].attributes, l = attrs.length; i < l; i++) {
                        attr = attrs.item(i);
                        if (!skipAttributes || $.inArray(attr.nodeName, skipAttributes)) {
                            html += " " + attr.nodeName + "=\"";
                            if (attr.nodeName.indexOf("data-") == 0) {
                                var subName = attr.nodeName.substr(5);
                                foundData[subName] = true;
                                html += $el.data(subName);
                            }
                            else
                                html += attr.nodeValue;
                            html += "\"";
                        }
                    }
                    if (dataIdChecks && dataIdChecks.length > 0) {
                        for (var i = 0; i < dataIdChecks.length; i++) {
                            if (foundData[dataIdChecks[i]] != true) {
                                var val = $el.data(dataIdChecks[i]);
                                if (val) {
                                    html += " data-" + dataIdChecks[i] + "='" + val + "'";
                                }
                            }
                        }
                    }
                    html += (closed?"/":"") + ">";
                }
                self.$el.find(".ksg-layer-path").each(function () {
                    genDiv($(this));
                    html += "</div>\n";
                });

                self._playerSlideEls().each(function () {
                    var $slide = $(this);
                    genDiv($slide, [], ["style"]);
                    genDiv($slide.find(".ksg-slide-image img"), [], ["style"], "img", true);
                    var $clones = $slide.find(".ksg-slide-layer.ksg-layer-clone");
                    $slide.find(".ksg-slide-layer:not(.ksg-layer-clone)").each(function (index) {
                        $(this).removeClass("inedit");
                        //TODO: Move the looping logic to genDiv where it can stop if it sees an index doesn't exist. 
                        //This is a crappy hack to get things in motion. Limits # of keyframes to 100 for now.
                        var items = [];
                        for (var xx = 1; xx <= 100; xx++) {
                            items.push("css" + xx, "animi-time"+xx);
                        }

                        genDiv($(this), items, ["style"]);
                        var layerHtml = $(this).html();
                        //if ($(this).data("clone"))
                        //    layerHtml = $(this).data("clone").html();
                        var $clone = $clones.eq(index);
                        if ($clone.length)
                            layerHtml = $clone.html();
                        html += layerHtml +
                            "</div>";
                    });

                    html += "</div>\n";
                });

                html += "</div>";

                return html;
            }
        },

        saveSlideShow: function ($ssbody, options) {
            if (options.saveUrl) {
                var generator = this.slideShowContentGenerator[this.options.slideShowType];
                if (generator) {
                    $.ajax(options.saveUrl, {
                        data: $.extend({},{
                            id: this.$el.attr("id"),
                            html: generator.apply(this, [$ssbody, options])
                        },options.saveUrlData),
                        type: "POST"
                    }).done(function (rsp) {
                    });
                }
            }
        },

        _updateSlideShow: function () {
            var self = this, $w = self.$w, $body = $w("body"), options = self.$el.syrinxSlider("getOptions");
            options.timePerSlide = Number($body.find("#slideTime").val());
            options.pauseWhileMouseInSlide = $body.find("#pauseOnMouse").prop("checked");
            options.sizeToWindow = $body.find("#sizeToWindow").prop("checked");
            if (!options.sizeToWindow) {
                self.$el.width($body.find("#ssWidth").val());
                self.$el.height($body.find("#ssHeight").val());
            }
            var $slides = self._playerSlideEls().remove();
            self._filmstripEls().each(function (index) {
                var origIndex = $w(this).data("origIndex"), $slide;
                if (origIndex < 0) {
                }
                else
                    $slide = $slides.eq(origIndex);

                if ($slide) {
                    $w(this).data("origIndex", index);
                    if ($w(this).data("imageUrl")) {
                        $slide.find("img:first").attr("src", $w(this).data("imageUrl")).css({ width: "", height: "" });
                    }
                    $slide.appendTo($(self.element)).data("bgSlideDir", $w(this).data("origSlideDir"));
                    var layers = $w(this).data("layers");
                    for (var lpos = 0; lpos < layers.length; lpos++) {
                        var layer = layers[lpos];
                        if (layer.path == null) {
                            var baseTime = 0, $layer = null,
                                $layerEls = $slide.find(".ksg-slide-layer:not(.ksg-layer-clone)");

                            if (layer.origIndex < 0) {
                                //TODO:Refactor a new method in slideshow JS as this is a rip of it a bit too - when creating clone for animation changes.
                                var $nle = $(self._newLayerHtml(layer)).appendTo($slide);
                                var $clone = $nle.clone(true).addClass("ksg-layer-clone").insertAfter($nle);
                                $nle.data("clone", $clone);
                                layer.origIndex = $layerEls.length;
                            }

                            var $layer = $layerEls.eq(layer.origIndex);
                            $layer.data("layerTitle", layer.title);
                            for (var kpos = 0; kpos < layer.keyFrames.length; kpos++) {
                                var keyframe = layer.keyFrames[kpos];
                                if (kpos == 0)
                                    $layer.data("delay", keyframe.time);
                                else
                                    $layer.data("animiTime" + kpos, keyframe.time - baseTime);
                                $layer.data("css" + (kpos + 1), keyframe.css);
                                baseTime = keyframe.time;
                            }
                        }
                    }
                }
            });
            $(self.element).syrinxSlider("refresh");
        },

        _displayKeyframeDetails: function (index, keyframe) {
            var self = this,
                $body = self.$w("body");
            $body.find("#keyframeCss").val(keyframe.css);
            self.activeKeyframe = keyframe;
            self.activeKeyframeIndex = index;
        },

        _setupFilmstripImgSizes: function () {
            var self = this, $w = self.$w;
            self.$filmstrip.find(".ksg-slide-filmcell img").each(function () {
                if($w(this).attr("src").indexOf(self.options.slideStripSizePart) == -1)
                    self.$el.syrinxSlider("sizeupForImage", $w(this));
            });
        },

        _createNewSlide: function () {
            var self=this, $w = self.$w;
            var html = "<div class='ksg-slide' data-bg-slide-dir='right bottom out' style='position:absolute;overflow:hidden'>" +
                        "<div class='ksg-slide-image' style='position: absolute;'>" +
                            "<img src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='/>" +
                        "</div></div>";
            var index = self._playerSlideEls().length;
            var $slide = $(html).appendTo(self.$el);
            self._setupFilmStripCell($w(self._slideStripCellHtml($slide, index)).appendTo(".ksg-filmstrip-corearea tr").find(".ksg-slide-filmcell"), true);
            self._setupFilmstripImgSizes();
            self.$el.syrinxSlider("refresh");
            //self._updateSlideShow();
        },

        _deleteSlide: function () {
            this._selectedFilmstripEl().remove();
            this._updateSlideShow();
            if(this._playerSlideEls().length != 0)
                this.$el.syrinxSlider("moveNext");
        },

        _newKeyframe: function (cloneSelected) {
            var self = this;
            if (self.activeLayer != null) {
                var $filmSlide = self.$w(".ksg-slide-filmcell.selected"),
                    layers = $filmSlide.data("layers");
                var keyframes = layers[self.activeLayer].keyFrames;
                keyframes.splice(cloneSelected?self.activeKeyframeIndex:0, 0, $.extend(true, {}, cloneSelected ? self.activeKeyframe : {
                    time: 0,
                    css: "{top:'0px',left:'0px',width:'100px',height:'100px'}"
                }));
                for (var pos = 0; pos < keyframes.length; pos++)
                    keyframes[pos].origIndex = pos;
                self._showSlideLayers($filmSlide);
            }
        },

        blankImgUrl: function() {
        },

        setupActiveLayer: function (index) {
            var self = this,
                $slide = self.$el.syrinxSlider("getCurrentSlide");
            self.activeLayer = index;

            $slide.find(".ksg-slide-layer").removeClass("inedit").attr("contentEditable", false);
            var $clone = $slide.find(".ksg-slide-layer.ksg-layer-clone").eq(index).addClass("inedit");
            $layer = $slide.find(".ksg-slide-layer:not(.ksg-layer-clone)").eq(index).data("clone", $clone);
            if ($clone)
                $clone.addClass("inedit").attr("contentEditable", true);
        },

        editSlideShow: function () {
            var self = this;
            this.slideShowEditWin = window.open("", "ksgSlideShowEditor", "width=540, height=700, resizable=1");
            this.slideShowEditWin.document.write("<!DOCTYPE html><html xmlns='http://www.w3.org/1999/xhtml'><head><title>Slideshow Editor</title>" + 
                "<script src='//ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js' type='text/javascript'></script><script src='//ajax.googleapis.com/ajax/libs/jqueryui/1.8.23/jquery-ui.min.js'></script>" +
                "<style type='text/css'>" +
                    "body {margin:0;padding:0} .slide-details-core{position:absolute;top:120px;bottom:0px;left:0px;right:0px;overflow:auto;} " +
                    "fieldset {position:relative;margin-top:10px;} .frameset-buttons{position:absolute;top:-3px;right:10px;} " +
                    ".slideshow-size input {width:50px;} " + 
                    ".ksg-filmstrip-track{width:100%;overflow-x:auto; overflow-y:hidden;} " +
                    ".ksg-slide-filmcell{border:solid 1px black;line-height:0px;} .ksg-slide-filmcell.selected {border:solid 1px yellow;} " +
                    ".slide-move {float:left;padding-left:15px;} .slide-move-horz{padding-left:0px;} " +
                    ".layer-details{position:relative;} .layer-names {;overflow:hidden;position:absolute;top:24px;} .layer-name {width:100px;font-size:10px;height:12px;} .layer-timelines {margin-left:103px;} " +
                    ".layer-keyframes{padding:5px;} .timelines-container{position:relative;border-bottom:solid 1px black;} .timeline-box{position:relative;padding-top:8px;padding-bottom:9px;} .timeline-box.selected{background-color:#CCFFFF} " +
                    ".timeline{height:2px;border:solid 1px black;background-color:#C0C0C0;} .keyframe{cursor:pointer;position:absolute;margin-left:-4px;width:6px;height:6px;background-color:red;border:solid 1px red;top:6px} .keyframe.selected {border:solid 1px blue;}" +
                    ".time-ruler{height:20px;background-color:whitesmoke;border-bottom:solid 1px black;position:relative;overflow:hidden;} .time-tic{position:absolute;bottom:2px;font-size:8px;} .time-tic-line {position:absolute;top:0px;bottom:0px; width:2px;border-left:solid 1px black;pointer-events: none;} " +
                    ".mouse-time-pos {float:right;font-size:9px;}" + 
                "</style>" +
                "<script>$.fn.imagesLoaded = function (callback) {var elems = this.filter('img'),len = elems.length,blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';elems.bind('load.imgloaded', function () {if (--len <= 0 && this.src !== blank) {elems.unbind('load.imgloaded');callback.call(elems, this);}}).each(function () {if(this.complete || this.complete === undefined) {var src = this.src;this.src = blank;this.src = src;}});return this;};</script>" +
                "</head><body></body></html>");

            function updateSlideShow() {
                self._updateSlideShow();
            }

            setTimeout(function () {
                var $w = self.$w = self.slideShowEditWin.$,
                    $ssbody = $w(self.slideShowEditWin.document.body).html(self._slideShowEditHtml()),
                    options = self.$el.syrinxSlider("getOptions");

                function togglePlayPause() {
                    $w("#play").toggle();
                    $w("#pause").toggle();
                }

                self.$filmstrip = $ssbody.find(".ksg-filmstrip-track");
                self._setupFilmstripImgSizes();

                $ssbody.on("click", "#save", function () {
                    self.saveSlideShow($ssbody, options);
                }).on("click", "#createSlide", function () {
                    self._createNewSlide();
                }).on("click", "#deleteSlide", function () {
                    self._deleteSlide();
                }).on("click", "#play", function () {
                    self.$el.syrinxSlider("play");
                    togglePlayPause();
                }).on("click", "#pause", function () {
                    self.$el.syrinxSlider("pause");
                    togglePlayPause();
                }).on("click", "#loopSlide", function () {
                    self.$el.syrinxSlider("loopSlide", !self.$el.syrinxSlider("loopSlide"));
                }).on("click", "#newLayer", function () {
                    var $filmSlide = $w(".ksg-slide-filmcell.selected"),
                        layers = $filmSlide.data("layers");
                    layers.push({
                        title: "new layer",
                        origIndex: -1,
                        keyFrames: [{
                            time: 0,
                            css: "{'top': '0px', 'left': '0px', 'width': '100px', 'height': '100px', opacity:'1'}",
                            origIndex: 0
                        }]
                    });
                    self.activeLayer = null;
                    self._showSlideLayers($filmSlide);
                    updateSlideShow();
                }).on("click", "#deleteLayer", function () {
                    if (self.activeLayer) {
                        var $filmSlide = $w(".ksg-slide-filmcell.selected"),
                            layers = $filmSlide.data("layers");
                        layers.splice(self.activeLayer, 1);
                        self._showSlideLayers($filmSlide);
                        self.activeLayer = null;
                        updateSlideShow();
                    }
                }).on("click", "#newKeyframe", function () {
                    self._newKeyframe(false);
                    updateSlideShow();
                }).on("click", "#cloneKeyframe", function () {
                    self._newKeyframe(true);
                    updateSlideShow();
                }).on("click", "#deleteKeyframe", function () {
                    if (self.activeKeyframe) {
                        var $filmSlide = self.$w(".ksg-slide-filmcell.selected"),
                            layers = $filmSlide.data("layers");
                        var keyframes = layers[self.activeLayer].keyFrames;
                        keyframes.splice(self.activeKeyframeIndex, 1);
                        self.activeKeyframeIndex = self.activeKeyframe = null;
                        self._showSlideLayers();
                        updateSlideShow();
                    }
                }).on("focusin", ".layer-name", function (event) {
                    self.setupActiveLayer($w(this).data("origIndex"));
                    $w(".layer-keyframes").each(function () {
                        $(this).syrinxKeyFrameTimeline("selectTimeline", self.activeLayer);
                    });

                }).on("change", "#slideshowDetails input:checkbox", function () {
                    updateSlideShow();
                }).on("focusout", "#slideshowDetails input:text, #slideDetails", function () {
                    updateSlideShow();
                    self._showSlideLayers();
                }).on("change", ".layer-name", function (event) {
                    var $filmSlide = self.$w(".ksg-slide-filmcell.selected"),
                        layers = $filmSlide.data("layers"),
                        layer = layers[$w(this).data("origIndex")];
                    layer.title = $w(this).val();
                    updateSlideShow();
                }).on("timeline.layerSelected", function (event, index) {
                    self.setupActiveLayer(index);
                }).on("timeline.keyframeSelect", function (event, index, keyframe, isUpdate) {
                    self._displayKeyframeDetails(index, keyframe);

                    var $slide = self.$el.syrinxSlider("getCurrentSlide"),
                        $clone = $slide.find(".ksg-slide-layer.ksg-layer-clone.inedit");//,
                    //$clone = $layer.data("clone");

                    $clone.show().css(eval("(" + keyframe.css + ")"));
                    if (isUpdate)
                        updateSlideShow();
                }).on("focusout", "#keyframeCss", function (event) {
                    self.activeKeyframe.css = $(this).val();
                    updateSlideShow();
                }).on("click", "#setSlideImg", function () {
                    self.$el.trigger("sshowedit.uploadImg");
                });

                self.$el.bind("slider.slideTic", function (evt, slideTic) {

                }).bind("slider.slideChange", function (evt, index) {
                });

                $ssbody.find("#pauseOnMouse").prop("checked", options.pauseWhileMouseInSlide);
                $ssbody.find("#sizeToWindow").prop("checked", options.sizeToWindow);
                $ssbody.find("#ssWidth").val(self.$el.width());
                $ssbody.find("#ssHeight").val(self.$el.height());
                $ssbody.find("#slideTime").val(options.timePerSlide);

                self.setupFilmStrip();
                $w(".ksg-slide-filmcell:first").click();
            },200);
        }
    });

    $.fn.syrinxSlideShowEditor = function (op) {
        var passed = Array.prototype.slice.call(arguments, 1);
        var rc = this;
        this.each(function () {
            var plugin = $(this).data('syrinxSlideShowEditor');
            if (undefined === plugin) {
                var $el = $(this);
                plugin = new SyrinxSlideShowEditor(this, op);
                $el.data('syrinxSlideShowEditor', plugin, this.href);
            }
            else if (plugin[op]) {
                rc = plugin[op].apply(plugin, passed);
            }
        });
        return rc;
    }



    //---- Key Frame Timeline --------------------------------
    function SyrinxKeyFrameTimeline(element, options) {
        var self = this;
        self.$w = options.$w ? options.$w : $;
        self.options = options;
        self.$el = self.$w(element);
        self.maxTime = 0;

        var timelines = self.options.timelines;
        for (var pos = 0; pos < timelines.length; pos++) {
            var timeline = timelines[pos];
            for (var kpos = 0; kpos < timeline.keyFrames.length; kpos++) {
                if (timeline.keyFrames[kpos].time > self.maxTime)
                    self.maxTime = timeline.keyFrames[kpos].time;
            }
        }
        if (self.maxTime < options.totalTime)
            self.maxTime = options.totalTime;

        self._setupTimelines();
    }

    $.extend(true, SyrinxKeyFrameTimeline.prototype, {
        _setupTimelines: function () {
            var self = this;
            var $w = self.$w;
            function calcKeyframeLeft(time) {
                return (time * 100) / self.maxTime;
            }
            function setKeyframeSelected($keyframe, isUpdate) {
                var keyframes = self.options.timelines[$keyframe.data("timelineIndex")].keyFrames;
                var kpos = 0;
                for(; kpos < keyframes.length; kpos++)
                    if(keyframes[kpos].origIndex == $keyframe.data("keyframeIndex")) {
                        self.selectedKeyframe = keyframes[kpos];
                        break;
                    }

                self.$el.find(".keyframe").removeClass("selected");
                $keyframe.addClass("selected");
                self._setSelectedLayer($keyframe.parent());

                self.$el.trigger("timeline.keyframeSelect", [kpos, self.selectedKeyframe, isUpdate==true]);
            }

            function sortKeyframesByTime(timeline) {
                timeline.keyFrames.sort(function (k1, k2) {
                    if (k1.time < k2.time)
                        return -1;
                    if (k1.time > k2.time)
                        return 1;
                    return 0;
                });
            }

            var html = "<div class='layer-timelines'>";
            var timelines = self.options.timelines;
            var numTimelines = timelines.length;
            if (numTimelines > 0) {
                html += "<div class='time-ruler'></div><div class='timelines-container'>";
                for (var pos = 0; pos < numTimelines; pos++) {
                    var timeline = timelines[pos];
                    html += "<div class='timeline-box' data-orig-index='" + pos + "'><div class='timeline'></div>";
                    for (var kpos = 0; kpos < timeline.keyFrames.length; kpos++) {
                        var keyframe = timeline.keyFrames[kpos];
                        html += "<div class='keyframe' style='left:" + calcKeyframeLeft(keyframe.time) + "%' title='" + keyframe.time + "' data-timeline-index='" + pos + "' data-keyframe-index='" + kpos + "' data-orig-index='" + kpos + "' ></div>";
                    }
                    html += "</div>";
                }
            }
            html += "</div></div><div class='mouse-time-pos'></div><br style='clear:both' />";
            self.$el.html(html).children().first().on("mousemove", ".timeline-box", function (event) {
                //var w = $w(this).innerWidth();
                var mpos = event.offsetX;
                if ($w(event.srcElement).hasClass("keyframe"))
                    mpos += $w(event.srcElement).position().left;

                var innerWidth = self.$el.find(".timelines-container").innerWidth();
                //var mpos = event.clientX - innerWidth;//self.$el.position().left;// - Number(self.$el.css("paddingLeft").replace(/\D+/, ''));
                var timePos = self.maxTime * (mpos * 100 / innerWidth) / 100;
                self.$el.find(".mouse-time-pos").text(  (( 50 * Math.floor((timePos/50)+0.5)) / 1000).toFixed(3) + "s");
            }).on("click", ".keyframe", function (event) {
                setKeyframeSelected($(this));
            }).on("click", ".timeline-box", function () {
                self._setSelectedLayer($(this));
            });

            self._setupTimeRuler();

            $w(".keyframe").draggable({
                distance: 4,
                axis: "x", containment: "parent",
                start: function (event, ui) {
                    setKeyframeSelected($w(this));
                },
                stop: function (event, ui) {
                    var newLeft = ui.position.left;
                    var innerWidth = self.$el.find(".timelines-container").innerWidth();
                    var posPercent = newLeft * 100 / innerWidth;
                    var newTime = Number((self.maxTime * (newLeft * 100 / innerWidth) / 100).toFixed(0));
                    newTime = ((50 * Math.floor((newTime / 50) + 0.5)) / 1000)
                    var timeline = timelines[$w(this).data("timelineIndex")];
                    self.selectedKeyframe.time = newTime * 1000;
                    sortKeyframesByTime(timeline, true);
                    $w(this).css("left", posPercent + "%").attr("title", newTime);
                    setKeyframeSelected($w(this), true);
                }
            });
        },

        _setSelectedLayer: function ($layer) {
            if (!$layer.hasClass("selected")) {
                this.$el.find(".timeline-box").removeClass("selected");
                $layer.addClass("selected");
                this.$el.trigger("timeline.layerSelected", $layer.data("origIndex"));
            }
        },

        selectTimeline: function(index) {
            this.$el.find(".timeline-box").removeClass("selected").eq(index).addClass("selected");
        },

        _calcLeftFromTime: function (time) {
            return ((time * 100) / this.maxTime) + "%";
        },

        _setupTimeRuler: function () {
            var self = this, $w = self.$w, timePerTic = 1000,
                totalMajTics = Math.floor(self.maxTime / timePerTic),
                $tlc = $w(".timelines-container");
            $tlc.height($tlc.find(".timeline-box").length * $tlc.find(".timeline-box").outerHeight());
            for (var tic = 0; tic < self.maxTime; tic += timePerTic) {
                var left = self._calcLeftFromTime(tic);
                $w("<div class='time-tic'>" + (tic / 1000).toFixed(1) + "s</div>").appendTo($w(".time-ruler")).css({ left: left });
                $w("<div class='time-tic-line'></div>").appendTo($w(".timelines-container")).css({ left: left });
            }
        }
    });

    $.fn.syrinxKeyFrameTimeline = function (op) {
        var passed = Array.prototype.slice.call(arguments, 1);
        var rc = this;
        this.each(function () {
            var plugin = $(this).data('syrinxKeyFrameTimeline');
            if (undefined === plugin || typeof(op) == "object") {
                var $el = $(this);
                plugin = new SyrinxKeyFrameTimeline(this, op);
                $el.data('syrinxKeyFrameTimeline', plugin, this.href);
            }
            else if (plugin[op]) {
                rc = plugin[op].apply(plugin, passed);
            }
        });
        return rc;
    }
})(jQuery);

