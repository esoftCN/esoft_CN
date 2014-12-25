(function ($) {
    $("body").on("click","#slideout .prev", function () {
        $(".ksg-slide-show").syrinxSlider("movePrev");
    }).on("click", "#slideout .next", function () {
        $(".ksg-slide-show").syrinxSlider("moveNext");
    }).on("click", "#slideout .slideBtn", function () {
        var toRight = $("#slideout").outerWidth() * -1;
        if ($("#slideout").css("right") != "-10px")
            toRight = -10;
        $("#slideout").animate({
            right: toRight
        }, 750, options.easing);
    });

    var options = {
        initiallyOpen: false,
        sourcePart: "/Large/",
        replaceSourcePart: "/Sidebar/",
        easing: "swing",
        thumbSize: { width: 110, height: 65 }
    }

    function setupThumbs() {
        if($("#slideout").length == 0) {
        $("<div id='slideout' style='display:inline-block;'>" +
        "<div class='innerslideout'></div>" +
        "<div class='slidecontent'>" +
            "<div class='outerTime' style='border:solid 1px black'>" +
                "<div class='innerTime' style='height:8px;background-color:blue;width:0px;'></div>" +
            "</div>" +
            "<div class='prev btn'>P</div>" +
            "<div class='next btn'>N</div>" +
            "<div style='clear:both'></div>" +
            "<div class='slideBtn'>SS</div>" +
            "<div class='thumbs'></div>" +
        "</div>" +
        "</div>").appendTo("body");
        }

        $("#slideout .thumbs").html("");
        $(".ksg-slide-show .ksg-slide-image > img").each(function (index) {
            $("#slideout .thumbs").append("<div class='thumb' data-index='" + index + "' style='overflow:hidden;width:" + options.thumbSize.width + "px;height:" + options.thumbSize.height + "px;'><img src='" + this.src.replace(options.sourcePart, options.replaceSourcePart) + "' /></div>");
        });
        $("#slideout .thumb img").each(function () {
            $(this).imagesLoaded(function () {
                $(".ksg-slide-show").syrinxSlider("sizeupForImage", $(this));
            });
        });
        if (!options.initiallyOpen)
            $("#slideout .slideBtn").click();
    }

    $("body").on("click", "#slideout .thumbs .thumb", function () {
        $(".ksg-slide-show").syrinxSlider("moveTo", $(this).data("index"));
    }).on("slider.slideTic", ".ksg-slide-show", function (evt, slideTic) {
        $("#slideout .innerTime").css("width", slideTic + "%");
    }).on("slider.slideChange", ".ksg-slide-show", function (evt, index) {
        $("#slideout .thumb").removeClass("active").eq(index).addClass("active");
    }).on("slider.refresh", ".ksg-slide-show", function () {
        setupThumbs();
    }).on("slider.starting", ".ksg-slide-show", function () {
        //setupThumbs();
    });
})(jQuery);