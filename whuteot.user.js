// ==UserScript==
// @name        武理工教务系统自动批量教学评价
// @namespace   whuteot
// @description 武汉理工大学 学分制教务管理信息系统 自动教学评价 全选A 跳过问卷调查
// @author      Token Team
// @include     http://202.114.90.180/EOT/*
// @run-at      document-end
// @version     2.0
// @grant       unsafeWindow
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @license     MIT/Expat License
// ==/UserScript==

(function() {

  if(typeof unsafeWindow != 'undefined' && !window.$ && unsafeWindow.$) {
    window.$ = unsafeWindow.$;
  } else {
    return exec(wrapper);
  }

  wrapper();

  function exec(func) {
    var script = document.createElement('script');
    script.type = "text/javascript";
    script.textContent = '(' + func.toString() + ')();';
    document.body.appendChild(script);
  }

  function wrapper() {

    function pjrw(pjrwdm, options) {
      this.options = $.extend({}, pjrw.defaults, options);
      this.pjrwdm = pjrwdm;      // 评教任务代码
      this.pjzb_storage = [];    // 暂存该评教任务的各指标提交情况
      this.pjrw_count = 0;       // 评教任务提交次数
      this.pjzb_check_count = 0; // 评教指标保存情况查询次数
      this.error_locked = false; // 互斥锁 防止有多个错误发生时 options.error 被调用多次
    }

    pjrw.defaults = {
      timeout: 3000,                      // 最长请求时间
      zb_check_cycle: 1000,               // 评教指标检查周期 (单位毫秒)
      max_zb_save_attempts: 3,            // 保存评教指标的最大尝试次数
      max_zb_check_attempts: 10,          // 检查评教指标保存情况的最大尝试次数
      max_pjrw_save_attempts: 3,          // 保存评教任务信息的最大尝试次数
      success: function(pjrwdm, data) {}, // 评教成功时的回调
      fail: function(pjrwdm, data) {},    // 评教失败时的回调 (HTTP 状态码 < 400)
      error: function(errmsg, data) {}    // 发生错误时的糊掉 (次数超限、Ajax错误、HTTP状态码>=400等)
    };

    pjrw.zb = {
      'A': '9.25',
      'B': '8',
      'C': '6.75',
      'D': '5',
      'E': '3'
    };

    // 保存一个评教任务中的一个指标
    // zbdm: 指标代码 范围 1 - 10
    // zbda: 指标答案 可能的值有 A, B, C, D, E
    pjrw.prototype.save_zb = function(zbdm, zbda) {
      zbda = zbda ? zbda.toUpperCase() : 'A';
      $.ajax({
        url: '/EOT/rwpjzbSave.do',
        type: 'POST',
        global: false,
        context: this,
        timeout: this.options.timeout,
        data: {
          pjrwdm: this.pjrwdm, // 评教任务代码
          pjzbdm: zbdm,        // 评教指标代码
          zbda: zbda,          // 指标答案
          pjfz: pjrw.zb[zbda]  // 评教分值
        },
        beforeSend: function(jqXHR, settings) {
          var count = this.pjzb_storage[zbdm] ? this.pjzb_storage[zbdm].count + 1 : 1;
          this.pjzb_storage[zbdm] = {
            count: count
          };
        },
        success: function(data, textStatus, jqXHR) {
          this.pjzb_storage[zbdm] = {
            value: zbda,
            count: this.pjzb_storage[zbdm].count
          };
        },
        error: function(jqXHR, textStatus, errorThrown) {
          if(this.pjzb_storage[zbdm].count <= this.options.max_zb_save_attempts) {
            return this.save_zb(zbdm, zbda);
          } else if(this.options.error && !this.error_locked) {
            this.options.error('zb_save_limit_exceeded', {
              pjrwdm: this.pjrwdm,
              jqXHR: jqXHR,
              textStatus: textStatus,
              errorThrown: errorThrown
            });
          }
        }
      });
    };

    // 保存评教任务信息
    pjrw.prototype.save_pjrw = function(callback) {
      $.ajax({
        url: '/EOT/rwpjSave.do',
        type: 'POST',
        dataType: 'json',
        cache: false,
        global: false,
        context: this,
        timeout: this.options.timeout,
        data: {
          pjrwdm: this.pjrwdm,               // 评教任务代码
          cpdxdm: '',                        // 测评对象代码?
          zb1: this.pjzb_storage[1].value,   // 测评指标 1 答案
          zb2: this.pjzb_storage[2].value,   // 测评指标 2 答案
          zb3: this.pjzb_storage[3].value,   // 测评指标 3 答案
          zb4: this.pjzb_storage[4].value,   // 测评指标 4 答案
          zb5: this.pjzb_storage[5].value,   // 测评指标 5 答案
          zb6: this.pjzb_storage[6].value,   // 测评指标 6 答案
          zb7: this.pjzb_storage[7].value,   // 测评指标 7 答案
          zb8: this.pjzb_storage[8].value,   // 测评指标 8 答案
          zb9: this.pjzb_storage[9].value,   // 测评指标 9 答案
          zb10: this.pjzb_storage[10].value, // 测评指标 10 答案
          zbtmdm: 9,                         // 指标??代码?
          py: '',                            // 意见与建议
          wjwtdm: 9,                         // ????代码?
          xzwdt: '',                         // ?
          xzwdttm: 9,                        // ?
          xzwdtxx: 'G',                      // ?
          wdttm: 10,                         // ?
          wdt: ''                            // 本课程教学过程中，你个人觉得受益最大的或最满意的地方是
        },
        beforeSend: function(jqXHR, settings) {
          this.pjrw_count++;
        },
        success: function(data, textStatus, jqXHR) {
          if(data.statusCode == '200') {
            if(this.options.success) {
              this.options.success(this.pjrwdm, data);
            }
          } else {
            if(this.options.fail) {
              this.options.fail(this.pjrwdm, data);
            }
          }
          if(callback) callback(this.pjrwdm, data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          if(this.pjrw_count <= this.options.max_pjrw_save_attempts) {
            return this.save_pjrw(callback);
          } else if(this.options.error && !this.error_locked) {
            this.options.error('pjrw_save_limit_exceeded', {
              pjrwdm: this.pjrwdm,
              jqXHR: jqXHR,
              textStatus: textStatus,
              errorThrown: errorThrown
            });
          }
        }
      });
    };

    // 检查 10 个评教指标是否都已提交
    // 如果是，则自动保存评教任务信息
    // 否则在一个周期后继续检查，直到次数超限
    pjrw.prototype.check_if_all_zb_saved = function(callback) {
      var all_saved = true;
      for(var i=1; i<=10; ++i) {
        if(this.pjzb_storage[i] && this.pjzb_storage[i].value) continue;
        all_saved = false;
        break;
      }
      this.pjzb_check_count++;
      if(all_saved) {
        this.save_pjrw(callback);
      } else if(this.pjzb_check_count <= this.options.max_zb_check_attempts) {
        setTimeout(this.check_if_all_zb_saved.bind(this, callback), this.options.zb_check_cycle);
      } else if(this.options.error && !this.error_locked) {
        this.options.error('zb_check_limit_exceeded', {
          pjrwdm: this.pjrwdm
        });
      }
    };

    // 开始处理该评教任务
    pjrw.prototype.submit = function(callback) {
      for(var i=1; i<=10; ++i) {
        this.save_zb(i);
      }
      this.check_if_all_zb_saved(callback);
    };

    var EOT = {};
    EOT.lessons = [];
    EOT.lessonsTab = null;
    EOT.rwpjOffset = 0;

    // 初始化
    EOT.init = function() {
      EOT.showStartButton();
    };

    // 显示开始评教按钮
    EOT.showStartButton = function() {
      $("<a href='#'>开始评教</a>").css({
        "z-index"     : 10000,
        "position"    : "absolute",
        "top"         : "55px",
        "right"       : "24px",
        "padding"     : "0 8px",
        "color"       : "#ffffff",
        "background"  : "#000000",
        "font-family" : '"Segoe UI", "Lucida Grande", Helvetica, Arial, "Microsoft YaHei Light", "Microsoft YaHei", FreeSans, Arimo, "Droid Sans","wenquanyi micro hei","Hiragino Sans GB", "Hiragino Sans GB W3", sans-serif',
        "font-size"   : "16px",
        "opacity"     : 0.6
      }).click(function() {
        EOT.showLessonsListTab();
        $(this).remove();
      }).appendTo("body");
    };

    // 加载 jGrowl 插件
    EOT.registerJGrowl = function() {
      (function(e){var t=function(){return!1===e.support.boxModel&&e.support.objectAll&&e.support.leadingWhitespace}();e.jGrowl=function(t,i){0==e("#jGrowl").size()&&e('<div id="jGrowl"></div>').addClass(i&&i.position?i.position:e.jGrowl.defaults.position).appendTo("body"),e("#jGrowl").jGrowl(t,i)},e.fn.jGrowl=function(t,i){if(e.isFunction(this.each)){var o=arguments;return this.each(function(){void 0==e(this).data("jGrowl.instance")&&(e(this).data("jGrowl.instance",e.extend(new e.fn.jGrowl,{notifications:[],element:null,interval:null})),e(this).data("jGrowl.instance").startup(this)),e.isFunction(e(this).data("jGrowl.instance")[t])?e(this).data("jGrowl.instance")[t].apply(e(this).data("jGrowl.instance"),e.makeArray(o).slice(1)):e(this).data("jGrowl.instance").create(t,i)})}},e.extend(e.fn.jGrowl.prototype,{defaults:{pool:0,header:"",group:"",sticky:!1,position:"top-right",glue:"after",theme:"default",themeState:"highlight",corners:"10px",check:250,life:3e3,closeDuration:"normal",openDuration:"normal",easing:"swing",closer:!0,closeTemplate:"&times;",closerTemplate:"<div>[ close all ]</div>",log:function(){},beforeOpen:function(){},afterOpen:function(){},open:function(){},beforeClose:function(){},close:function(){},animateOpen:{opacity:"show"},animateClose:{opacity:"hide"}},notifications:[],element:null,interval:null,create:function(t,i){var i=e.extend({},this.defaults,i);i.speed!==void 0&&(i.openDuration=i.speed,i.closeDuration=i.speed),this.notifications.push({message:t,options:i}),i.log.apply(this.element,[this.element,t,i])},render:function(t){var i=this,o=t.message,n=t.options;n.themeState=""==n.themeState?"":"ui-state-"+n.themeState;var t=e("<div/>").addClass("jGrowl-notification "+n.themeState+" ui-corner-all"+(void 0!=n.group&&""!=n.group?" "+n.group:"")).append(e("<div/>").addClass("jGrowl-close").html(n.closeTemplate)).append(e("<div/>").addClass("jGrowl-header").html(n.header)).append(e("<div/>").addClass("jGrowl-message").html(o)).data("jGrowl",n).addClass(n.theme).children("div.jGrowl-close").bind("click.jGrowl",function(){e(this).parent().trigger("jGrowl.beforeClose")}).parent();e(t).bind("mouseover.jGrowl",function(){e("div.jGrowl-notification",i.element).data("jGrowl.pause",!0)}).bind("mouseout.jGrowl",function(){e("div.jGrowl-notification",i.element).data("jGrowl.pause",!1)}).bind("jGrowl.beforeOpen",function(){n.beforeOpen.apply(t,[t,o,n,i.element])!==!1&&e(this).trigger("jGrowl.open")}).bind("jGrowl.open",function(){n.open.apply(t,[t,o,n,i.element])!==!1&&("after"==n.glue?e("div.jGrowl-notification:last",i.element).after(t):e("div.jGrowl-notification:first",i.element).before(t),e(this).animate(n.animateOpen,n.openDuration,n.easing,function(){e.support.opacity===!1&&this.style.removeAttribute("filter"),null!==e(this).data("jGrowl")&&(e(this).data("jGrowl").created=new Date),e(this).trigger("jGrowl.afterOpen")}))}).bind("jGrowl.afterOpen",function(){n.afterOpen.apply(t,[t,o,n,i.element])}).bind("jGrowl.beforeClose",function(){n.beforeClose.apply(t,[t,o,n,i.element])!==!1&&e(this).trigger("jGrowl.close")}).bind("jGrowl.close",function(){e(this).data("jGrowl.pause",!0),e(this).animate(n.animateClose,n.closeDuration,n.easing,function(){e.isFunction(n.close)?n.close.apply(t,[t,o,n,i.element])!==!1&&e(this).remove():e(this).remove()})}).trigger("jGrowl.beforeOpen"),""!=n.corners&&void 0!=e.fn.corner&&e(t).corner(n.corners),e("div.jGrowl-notification:parent",i.element).size()>1&&0==e("div.jGrowl-closer",i.element).size()&&this.defaults.closer!==!1&&e(this.defaults.closerTemplate).addClass("jGrowl-closer "+this.defaults.themeState+" ui-corner-all").addClass(this.defaults.theme).appendTo(i.element).animate(this.defaults.animateOpen,this.defaults.speed,this.defaults.easing).bind("click.jGrowl",function(){e(this).siblings().trigger("jGrowl.beforeClose"),e.isFunction(i.defaults.closer)&&i.defaults.closer.apply(e(this).parent()[0],[e(this).parent()[0]])})},update:function(){e(this.element).find("div.jGrowl-notification:parent").each(function(){void 0!=e(this).data("jGrowl")&&void 0!==e(this).data("jGrowl").created&&e(this).data("jGrowl").created.getTime()+parseInt(e(this).data("jGrowl").life)<(new Date).getTime()&&e(this).data("jGrowl").sticky!==!0&&(void 0==e(this).data("jGrowl.pause")||e(this).data("jGrowl.pause")!==!0)&&e(this).trigger("jGrowl.beforeClose")}),this.notifications.length>0&&(0==this.defaults.pool||e(this.element).find("div.jGrowl-notification:parent").size()<this.defaults.pool)&&this.render(this.notifications.shift()),2>e(this.element).find("div.jGrowl-notification:parent").size()&&e(this.element).find("div.jGrowl-closer").animate(this.defaults.animateClose,this.defaults.speed,this.defaults.easing,function(){e(this).remove()})},startup:function(i){this.element=e(i).addClass("jGrowl").append('<div class="jGrowl-notification"></div>'),this.interval=setInterval(function(){e(i).data("jGrowl.instance").update()},parseInt(this.defaults.check)),t&&e(this.element).addClass("ie6")},shutdown:function(){e(this.element).removeClass("jGrowl").find("div.jGrowl-notification").trigger("jGrowl.close").parent().empty(),clearInterval(this.interval)},close:function(){e(this.element).find("div.jGrowl-notification").each(function(){e(this).trigger("jGrowl.beforeClose")})}}),e.jGrowl.defaults=e.fn.jGrowl.prototype.defaults})(jQuery);
      $("body").append("<div id='TOPLEFTMSG' class='jGrowl top-left'><style stype='text/css'>div.jGrowl{z-index:100010;color:#fff;font-size:12px}div.jGrowl a{color:#FF0}div.jGrowl a:hover{text-decoration:underline}div.ie6{position:absolute}div.ie6.top-right{right:auto;bottom:auto;left:expression((0-jGrowl.offsetWidth+(document.documentElement.clientWidth?document.documentElement.clientWidth:document.body.clientWidth)+(ignoreMe2=document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft))+'px');top:expression((0+(ignoreMe=document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop))+'px')}div.ie6.top-left{left:expression((0+(ignoreMe2=document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft))+'px');top:expression((0+(ignoreMe=document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop))+'px')}div.ie6.bottom-right{left:expression((0-jGrowl.offsetWidth+(document.documentElement.clientWidth?document.documentElement.clientWidth:document.body.clientWidth)+(ignoreMe2=document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft))+'px');top:expression((0-jGrowl.offsetHeight+(document.documentElement.clientHeight?document.documentElement.clientHeight:document.body.clientHeight)+(ignoreMe=document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop))+'px')}div.ie6.bottom-left{left:expression((0+(ignoreMe2=document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft))+'px');top:expression((0-jGrowl.offsetHeight+(document.documentElement.clientHeight?document.documentElement.clientHeight:document.body.clientHeight)+(ignoreMe=document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop))+'px')}div.ie6.center{left:expression((0+(ignoreMe2=document.documentElement.scrollLeft?document.documentElement.scrollLeft:document.body.scrollLeft))+'px');top:expression((0+(ignoreMe=document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop))+'px');width:100%}div.jGrowl{position:absolute}body > div.jGrowl{position:fixed}div.jGrowl.top-left{left:0;top:0}div.jGrowl.top-right{right:0;top:0}div.jGrowl.bottom-left{left:0;bottom:0}div.jGrowl.bottom-right{right:0;bottom:0}div.jGrowl.center{top:0;width:50%;left:25%}div.center div.jGrowl-notification,div.center div.jGrowl-closer{margin-left:auto;margin-right:auto}div.jGrowl div.jGrowl-notification,div.jGrowl div.jGrowl-closer{background-color:#000;opacity:.85;-ms-filter:\"progid:DXImageTransform.Microsoft.Alpha(Opacity=85)\";filter:progid:DXImageTransform.Microsoft.Alpha(Opacity=85);zoom:1;width:235px;padding:10px;margin-top:5px;margin-bottom:5px;font-family:Tahoma,Arial,Helvetica,sans-serif;font-size:1em;text-align:left;display:none;-moz-border-radius:5px;-webkit-border-radius:5px;-o-border-radius:5px;border-radius:5px}div.jGrowl div.jGrowl-notification{min-height:40px}div.jGrowl div.jGrowl-notification,div.jGrowl div.jGrowl-closer{margin:10px}div.jGrowl div.jGrowl-notification div.jGrowl-header{font-weight:bold;font-size:.85em}div.jGrowl div.jGrowl-notification div.jGrowl-close{z-index:99;float:right;font-weight:bold;font-size:1em;cursor:pointer}div.jGrowl div.jGrowl-closer{padding-top:4px;padding-bottom:4px;cursor:pointer;font-size:.9em;font-weight:bold;text-align:center}@media print{div.jGrowl{display:none}}</style>");
      $.jGrowl.defaults.life = 1500;
      $.jGrowl.defaults.closerTemplate = "<div>[ 关闭全部 ]</div>";
    };

    // 注册基本样式
    EOT.registerStyle = function() {
      var css = "";
      css += '<style type="text/css">';
      css += '.text-muted { color: #777; }';
      css += '.text-primary { color: #428bca; }';
      css += 'a.text-primary:hover { color: #3071a9; }';
      css += '.text-success { color: #3c763d; }';
      css += 'a.text-success:hover { color: #2b542c; }';
      css += '.text-info { color: #31708f; }';
      css += 'a.text-info:hover { color: #245269; }';
      css += '.text-warning { color: #8a6d3b; }';
      css += 'a.text-warning:hover { color: #66512c; }';
      css += '.text-danger { color: #a94442; }';
      css += 'a.text-danger:hover { color: #843534; }';
      css += '.bg-primary { color: #fff; background-color: #428bca; }';
      css += 'a.bg-primary:hover { background-color: #3071a9; }';
      css += '.bg-success { background-color: #dff0d8; }';
      css += 'a.bg-success:hover { background-color: #c1e2b3; }';
      css += '.bg-info { background-color: #d9edf7; }';
      css += 'a.bg-info:hover { background-color: #afd9ee; }';
      css += '.bg-warning { background-color: #fcf8e3; }';
      css += 'a.bg-warning:hover { background-color: #f7ecb5; }';
      css += '.bg-danger { background-color: #f2dede; }';
      css += 'a.bg-danger:hover { background-color: #e4b9b9; }';
      css += '.text-green { color: #00ff00; }';
      css += '.jGrowl-message, .jGrowl-message p, .jGrowl-message b, .jGrowl-message span { font-size: 16px; font-family: "Segoe UI", "Lucida Grande", Helvetica, Arial, "Microsoft YaHei Light", "Microsoft YaHei", FreeSans, Arimo, "Droid Sans","wenquanyi micro hei","Hiragino Sans GB", "Hiragino Sans GB W3", sans-serif; }';
      css += '</style>';
      $("head").append(css);
    };

    // 模拟点击 功能模块->课程评教
    EOT.showLessonsListTab = function() {
      this.registerJGrowl();
      this.registerStyle();
      $.jGrowl("正在读取课程评教列表...");
      $("#sidebar > .accordion.dwz-accordion > .accordionContent a[rel='pjkcList']").click();
      var $this = this;
      setTimeout(function() {
        $this.detectLessonsListTab.call($this);
      }, 400);
    };

    // 判断课程评教选项卡是否已加载完成
    EOT.detectLessonsListTab = function() {
      if(navTab._indexTabId("pjkcList") == -1 || $("#progressBar").is(":visible")) {
        var $this = this;
        return setTimeout(function() {
          $this.detectLessonsListTab.call($this);
        }, 400);
      }
      $.jGrowl("课程评教列表已加载完成");
      this.collectLessons();
      this.startPJ();
    };

    // 收集课程评教列表
    EOT.collectLessons = function() {
      var tabindex = navTab._indexTabId("pjkcList");
      this.lessonsTab = $(".navTab-panel > .page:nth-child(" + (tabindex + 1) + ")");
      this.lessons = this.lessonsTab.find('table tr[target="sid_kcpjrwdm"]').map(function() {
        return {
          rel:       $(this).attr("rel"),
          lesson:    $(this).find("td:nth-child(1)").text(),
          teacher:   $(this).find("td:nth-child(2)").text(),
          type:      $(this).find("td:nth-child(3)").text(),
          starttime: $(this).find("td:nth-child(4)").text(),
          endtime:   $(this).find("td:nth-child(5)").text(),
          status:    $(this).find("td:nth-child(6)").text()
        };
      });
    };

    // 开始评教
    EOT.startPJ = function() {
      var $this = this;
      if(this.rwpjOffset >= this.lessons.length) {
        navTab.closeTab("rwpj");
        $("#sidebar > .accordion.dwz-accordion > .accordionContent a[rel='pjkcList']").click();
        return $.jGrowl("<p class='text-green'>评教完成!</p>", {sticky:true});
      } else if(this.lessons[this.rwpjOffset].status != "未评") {
        this.rwpjOffset++;
        return this.startPJ();
      } else if(!this.dateCheck(this.lessons[this.rwpjOffset].starttime, this.lessons[this.rwpjOffset].endtime, true)) {
        $("#TOPLEFTMSG").jGrowl("<p><b>" + this.lessons[this.rwpjOffset].lesson + "</b>不在评教时间内 已自动跳过</p>", {sticky:true});
        this.rwpjOffset++;
        return this.startPJ();
      }

      var lesson = this.lessons[this.rwpjOffset];
      var rel = lesson.rel;
      $.jGrowl("正在评教: <b class='text-primary'>" + lesson.lesson + "</b>");
      var temp = new pjrw(rel, {
        success: function(pjrwdm, data) {
          $this.rwpjOffset++;
          $.jGrowl("<p class='text-green'><b>" + lesson.lesson + "</b> 评教成功!</p>");
          $this.startPJ();
        },
        fail: function(pjrwdm, data) {
          console.error(lesson.lesson, pjrwdm, data);
          $("#TOPLEFT").jGrowl("<p class='text-danger'><b>" + lesson.lesson + "</b> 评教失败 已自动跳过!<br>失败详情可在 Console 中查看</p>", {sticky:true});
          $this.rwpjOffset++;
          $this.startPJ();
        },
        error: function(errmsg, data) {
          console.error(lesson.lesson, errmsg, data);
          $("#TOPLEFT").jGrowl("<p class='text-danger'><b>" + lesson.lesson + "</b> 评教失败 已自动跳过!<br>失败详情可在 Console 中查看</p>", {sticky:true});
          $this.rwpjOffset++;
          $this.startPJ();
        }
      });
      temp.submit();
    };

    // 检查评教时间
    EOT.dateCheck = function(startdate, enddate, ignoreEnddate) {
      var now = (new Date).getTime();
      var start = this.strtodate(startdate, 0, 0, 0, 0).getTime();
      var end = this.strtodate(enddate, 23, 59, 59, 0).getTime();
      return ignoreEnddate ? now >= start : now >= start && now <= end;
    };

    // 将形如 2015-01-01 的日期字串转换为 Date 对象
    EOT.strtodate = function(str, hour, minute, second, millisec) {
      var date = new Date();
      var tmp = str.match(/(\d+)-(\d+)-(\d+)/);
      var year = tmp[1] | 0;
      var month = tmp[2] | 0;
      var day = tmp[3] | 0;
      hour = hour || 0;
      minute = minute || 0;
      second = second || 0;
      millisec = millisec || 0;
      date.setFullYear(year);
      date.setMonth(month ? month - 1 : 0);
      date.setDate(day);
      date.setHours(hour);
      date.setMinutes(minute);
      date.setSeconds(second);
      date.setMilliseconds(millisec);
      return date;
    };

    EOT.init();
  }

})();
