/*
 * Cross v1.0 Copyright (c) 2014 lubin, https://github.com/lubin-1983/Cross
 * 50856845@qq.com
 */
var Cross=C={
	history : [],
	scrollCache  : {},
	scrollCurrent : null,
	transitionTime : 250,
	transitionTimingFunc : 'ease-in'
};
$(function(){
	C.Router.init();
});
(function($){
/**
 * 路由控制器
 */
C.Router = {
	/**
	 * 对a[data-target]链接绑定tap事件
	 */
	init : function(){
		$(window).on('popstate', this.popstateHandler);
		//阻止含data-target或者href以'#'开头的的a[data-target]元素的默认行为
		$(document).on('click','a[data-target]',function(e){
			var target = $(this).data('target'),
				href = $(this).attr('href');
			if(!href ||  href.match(/^#/) || target){
				e.preventDefault();
				return false;
			}
		});
		$(document).on('tap','a[data-target]',this.targetHandler);
		this.initIndex();
	},
	//处理app页面初始化
	/** 如果地址栏例如#ccc 转换到相应页面 */
	initIndex : function(){
        var targetHash = location.hash;
        //取页面中第一个section作为app的起始页
        var $section = $('section').first();
        var indexHash = '#'+$section.attr('id');
		indexHash = C.ParseHash(indexHash,$section);					
       	this.addHistory(indexHash);
		C.scrollCurrent=C.AppScroll(C.history[0].tag);
		if(!(typeof(indexHash.imglazyload)==='undefined')){C.Imglazyload();}
		if(!(typeof(indexHash.gotop)==='undefined')){C.GoTop();}
		if(targetHash != '' && targetHash != indexHash){
			C.Router.showSection(targetHash);//跳转到指定的页面
        }
    },
	
	/**
	 * 处理浏览器的后退事件
	 * 前进事件不做处理
	 * @private
	 */
	popstateHandler : function(e){
		if(C.history.length>1){
			var targetHash = location.hash;	
			if(targetHash==C.history[1].tag ){
				C.Dialog.hide();
				C.Router.goback();
			}else{
				return;
			}
		}else{
			return;	
		}	
	},
	/**
	 * 判断跳转方式
	 */
	targetHandler : function(){
		var $this = $(this),
			target = $this.attr('data-target'),
			href = $this.attr('href');
		switch(target){
			case 'section' : // 转换新的页面
				C.Router.showSection(href,$this);
				break;
			case 'article' : // 页面内容刷新 （头部和底部 不更新）  "刷新按钮"
				C.Router.showArticle(href,$this);
				break;
			case 'sidebar' : // 左侧面板
				C.Panel.show({contentWrap:'#sidebar',id:'menu'});
				break;
			case 'widgets' : // 右侧面板
				C.Panel.show({contentWrap:'#widgets',scrollMode:false,position:false})
				break;
			case 'back' :   // 后退			
				C.Router.goback();
				break;
		}
	},
	/**
     * 转换新的页面
	 * 手动转换 例如： C.Router.showSection('#news01','#news01'); 
	 * 强行改变它的转场方式 例如： C.Router.showSection('#news01','#news01',{'transition':'slideLeft'});  
     */
	showSection : function(hash,dom,opts){
		
        if(C.Panel.PanelOpen){//关闭菜单后再转场
            C.Panel.hide();
			setTimeout(function(){
                C.Router.showSection(hash);
            },400);
            return;
        }	
        
        var hashObj = C.ParseHash(hash,dom,opts); //读取hash信息
		/**同一个页面,则不重新加载*/			
        var current = C.history[0];         
        if(current.hash === hashObj.hash){ 
            return;
        }
		
		if($(hashObj.tag).length>0 && typeof(hashObj.refreshing)==='undefined'){//如果已经存在且不用刷新的直接转换
			C.Router.addHistory(hashObj);
			C.Transition({
					mode:hashObj.transition
				});
		}else{
			C.Dialog.loading();
			if($(hashObj.tag).length>0){//如果已经存在，要刷新)
				C.Page.addLoad(hashObj,true);
			}else{//没有存在 ajax加载
				C.Page.addLoad(hashObj,false);
			}
		}
    },
	/**
     * 后退
     */
    goback : function(){
		C.Transition({
				mode : C.history[0].transition,
				isback : true
			})
    },
	/**
     * 添加访问记录
     */
    addHistory : function(hash){
        window.history.pushState(hash.tag,'',hash.tag);
        C.history.unshift(hash);
		//console.info(C.history)
    },
	/**
     * 删减访问记录
     */
    cutHistory : function(){
        window.history.replaceState(C.history[0].tag,'',C.history[1].tag);        
        C.history.shift(C.history[0].hash);
		//console.info(C.history)
    }
};
/**
 * page 页面远程加载
 */
C.Page = {
	/**
     * 页面ajax远程加载 
	 * 
     */
	addLoad : function(hashObj,resetting,isback){	
		var formatHash = hashObj.tag.indexOf('#') == 0 ? hashObj.tag.substr(1) : hashObj.tag;
		C.DataAjax({
				Url : 'demo/'+formatHash+'.html'
			},function(datas){				
				var $section,sectionHtml='';
				if(resetting){
					$section=$(hashObj.tag);
					$section.html('');
				}else{
					var refreshing='';
					if(!(typeof(hashObj.refreshing)==='undefined')) refreshing=" data-refreshing="+hashObj.refreshing;
					$section=$('<section id="'+formatHash+'" data-transition="'+hashObj.transition+'"'+refreshing+'></section>').appendTo($('#layout'));
				}
				$(datas).appendTo($section);
				if(!isback){
					C.Dialog.hide();
					C.Router.addHistory(hashObj);
					C.Transition({
						mode:hashObj.transition
					});
				}else{
					C.scrollCurrent.scroller.refresh();
					if(!(typeof(hashObj.imglazyload)==='undefined')){C.Imglazyload();}
					if(!(typeof(C.history[0].gotop)==='undefined')){C.GoTop();}
				}
			})
	},
	/**
     * 内容ajax远程加载
     */
	conLoad : function(){
		
	}
}
/**
 * Transition 转场动画
 */
C.Transition = function(options){
	if(C.Dialog.hasDialogOpen){//弹出层是打开禁止转场
		return false;
	}
	var defaults = $.extend({
			mode : 'slideLeft',
			isback : false
		}, options || {});
	var animationClass = {
        	slide : [['slideLeftIn','slideRightIn'],['slideRightOut','slideLeftOut']],
        	slideUp : [['slideUpIn',''],['','slideUpOut']],
        	popup : [['scaleIn',''],['','scaleOut']]
        }
	var modes;
	switch(defaults.mode)
	{
	case 'slideLeft':
	  modes = defaults.isback ? animationClass.slide[1] :  animationClass.slide[0] ;
	  break;
	case 'slideUp':
	  modes = defaults.isback ? animationClass.slideUp[1] :  animationClass.slideUp[0] ;
	  break;
	case 'popup':
	  modes = defaults.isback ? animationClass.popup[1] :  animationClass.popup[0] ;
	  break;
	}
	var doms = defaults.isback ? [C.history[1].tag,C.history[0].tag] :  [C.history[0].tag,C.history[1].tag] ;
	
	$(doms[0]).addClass('anim animating '+modes[0]);
	$(doms[1]).addClass('anim animating '+modes[1]);
	C.scrollCurrent=C.AppScroll(C.history[0].tag);
    setTimeout(function() {
        $(doms[0]).removeClass('anim animating ' + modes[0]).addClass('selected').data('transition',defaults.mode);
        $(doms[1]).removeClass('selected anim animating ' + modes[1]);
        if (defaults.isback) {
            C.Router.cutHistory();
			if(!(typeof(C.history[0].refreshing)==='undefined') && C.history[0].refreshing){
				C.Page.addLoad(C.history[0],true,true);	
			}
        }else{
			if(!(typeof(C.history[0].imglazyload)==='undefined')){C.Imglazyload();}
			if(!(typeof(C.history[0].gotop)==='undefined')){C.GoTop();}
		}		
    }, 400);
};
/**
 * 返回 地址与参数
 */
C.ParseHash = function(hash,dom,opts) {
	var transition = typeof(opts)=='undefined' ? $(dom).data('transition') : opts.transition;
	var refreshing = typeof(opts)=='undefined' ? $(dom).data('refreshing') : opts.refreshing;
	var imglazyload = typeof(opts)=='undefined' ? $(dom).data('imglazyload') : opts.imglazyload;
	var gotop = typeof(opts)=='undefined' ? $(dom).data('gotop') : opts.gotop;
	var tag, query, param = {};
	var arr = hash.split('?');
	tag = arr[0];
	if (arr.length > 1) {
		var seg, s;
		query = arr[1];
		seg = query.split('&');
		for (var i = 0; i < seg.length; i++) {
			if (!seg[i])continue;
			s = seg[i].split('=');
			param[s[0]] = s[1];
		}
	}
	return {
		hash: hash,
		tag: tag,
		query: query,
		param: param,
		transition: transition,
		refreshing: refreshing,
		imglazyload: imglazyload,
		gotop: gotop
	};
};
/**
 * IScroll实例化
 * 注意: article 元素上 没有 data-scroll="true" 是不会被实例化的
 * 		article 元素内 一定要包含在 div 元素内 class="app-iscroll"
 */
C.AppScroll = function(dom,opts){
	var scroll,scrollId,$el = $(dom).find('article.wrapper'),
		options = {
		    scrollbars: true,
			mouseWheel: true,
			interactiveScrollbars: true,
			shrinkScrollbars: 'scale',
			fadeScrollbars: true,
			click: true// onclick事件在安卓UC浏览器会弹两次，得设置（触发过 一段时间内就不让它再触发了）
		};
	if(!$el.data('scroll')) return;  //不会被实例化的
	scrollId = $el.data('_appscroll_');		
	if(scrollId && C.scrollCache[scrollId]){
		scroll = C.scrollCache[scrollId];
		$.extend(scroll.scroller.options,opts)
		scroll.scroller.refresh();
		return scroll;
	}else{
		var id = dom.indexOf('#') == 0 ? dom.substr(1) : dom;
		scrollId = '_appscroll_'+id;
		$el.data('_appscroll_',scrollId);
		$.extend(options,opts);
		scroller = new IScroll($el[0],options);
		return C.scrollCache[scrollId] = {
			scroller : scroller,
			destroy : function(){
				scroller.destroy();
				delete scrollCache[scrollId];
			}
		};		
	};
	document.addEventListener('touchmove', function (e) { e.preventDefault();}, false);	
}
/**
 * 左右侧面板组件 
 */
C.Panel = {
	PanelOpen : false,
	opts:{},
	show : function(options){
		var panelOpts=$.extend({
							width: 260 ,
							/**  {Number}  */
							contentWrap: '',
							/**  {String} 例如： '#sidebar' */
							scrollMode: true,
							/**  {Boolean}  'false'表示浮层， 'true'表示将推出 */
							position: true,
							/**  {Boolean} 'true'面板组件是在左侧的，'false'面板组件是在右侧的 */
							id : null,
							/**  面板内容里面有用到IScroll ， 添加他的ID */
							mains : '#mains',
							paneldismiss : 'app-panel-dismiss'
						}, options || {});
		var $pages=$('#pages'),
			$paneldismiss=$('<div class="'+panelOpts.paneldismiss+'"></div>').appendTo($pages),
			dismissWidth,
			myscroll,
			init=function(){
				dismissWidth=$(window).width()-panelOpts.width;
				var dismissPosition = panelOpts.position ? panelOpts.width : 0,
					css = {
						width: dismissWidth + "px",
						left: dismissPosition + "px"
					};
				$paneldismiss.css(css);
				// 面板组件的 IScroll
				if(panelOpts.id!=null){
					myscroll = new IScroll('#'+panelOpts.id, {
						scrollbars: true,
						mouseWheel: true,
						shrinkScrollbars: 'scale',
						fadeScrollbars: true
					});
					document.addEventListener('touchmove', function (e) { e.preventDefault();}, false);
				}
				C.Panel.opts=panelOpts;
				C.Panel.PanelOpen=true;
			},
			animate=function(){
				var transformVal=panelOpts.position ? panelOpts.width : "-"+panelOpts.width;
				$(panelOpts.contentWrap).addClass('app-panel-animate').css(C.TransformVal(0))	
				if(panelOpts.scrollMode){
					$(panelOpts.mains).addClass('app-panel-animate').css(C.TransformVal(transformVal));
				}
			};			
			$paneldismiss.bind('click',function(){
				C.Panel.hide();
			});
		init();
		setTimeout(animate(),100)
		$(window).resize(function(){C.Throttle(init(),50,30)});
	},
	hide : function (){
			var transformVal=C.Panel.opts.position ? "-"+C.Panel.opts.width : C.Panel.opts.width;
			$(C.Panel.opts.contentWrap).css(C.TransformVal(transformVal))
			if(C.Panel.opts.scrollMode){			
				$(C.Panel.opts.mains).css(C.TransformVal(0));					
			}
			$('.'+C.Panel.opts.paneldismiss).remove();
			C.Panel.PanelOpen=false;
	}
} 
/**
 * 3D 横向滚动值
 */
C.TransformVal = function(transformVal){
	return {
				'-webkit-transform'	: 'translate('+transformVal+'px,0)',
				'-moz-transform'	: 'translate('+transformVal+'px,0)',
				'-o-transform'		: 'translate('+transformVal+'px,0)',
				'-ms-transform'		: 'translate('+transformVal+'px,0)',
				'transform'			: 'translate('+transformVal+'px,0)'
			};
},
/**
 * 函数节流
 */
C.Throttle = function(fn, delay, mustRunDelay){
	var timer = null;
	var t_start;
	return function(){
		var context = this, args = arguments, t_curr = +new Date();
		clearTimeout(timer);
		if(!t_start){
			t_start = t_curr;
		}
		if(t_curr - t_start >= mustRunDelay){
			fn.apply(context, args);
			t_start = t_curr;
		}
		else {
			timer = setTimeout(function(){
				fn.apply(context, args);
			}, delay);
		}
	};
};
/**
 * ajax
 */
C.DataAjax = function(options,callback,errorback){
	var defaults={
			Type:'GET',
			Url:'',
			Data:null,
			DataType:'html',
			Async: true,
			Timeout : 20000
		},	
		opts = $.extend(defaults, options);
	$.ajax({
	  type: opts.Type,
	  url: opts.Url,
	  async: opts.Async,
	  data: opts.Data || {},
	  dataType: opts.DataType,
	  timeout : opts.Timeout,
	  success:function(datas){
				if ($.isFunction(callback)) {
					callback(datas);
				}
		  },
	  error:function(){				
				if ($.isFunction(errorback)) {
					callback(errorback);
				}else{
					C.Dialog.tips('页面没有找到！','error','center',2000);
				}
		  }
	});
};
/**
 * TabSlider 选项卡及焦点图片组件
 * 
 */
C.TabSlider = function(dom,options){
	var $this=$(dom);
	
	if($this.length == 0) return this;
    if($this.length > 1){
        $this.each(function(){C.TabSlider($(this),options)});
        return this;
    }
	
	if($this.data('bind')){
		return false;	
	}else{
		$this.data('bind',true);
	}
	
    var opts = $.extend({
					auto : false,
					spend : 3000,
					threshold : 100,
					maxWidth : null,
					type : 'tabs' // 'tabs' , 'line' , 'slide'
    			}, options || {});
	
	var tw, timer,
		$hd = $this.find("ul.tabSlider-hd"), 
		$content = $this.find("div.tabSlider-bd"),
		$bd = $this.find("div.tabSlider-bd>div.tabSlider-wrap"),
		moved = false, isScrolling ,
		currentIndex = 0, minWidth , offset ,
		isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),
        hasTouch = 'ontouchstart' in window && !isTouchPad,
        start_ev = hasTouch ? 'touchstart' : 'mousedown',
        move_ev = hasTouch ? 'touchmove' : 'mousemove',
        end_ev = hasTouch ? 'touchend' : 'mouseup',
		c_ev = hasTouch ? 'tap' : 'click',
		//初始化
		_init=function(){
			_setStyle();
			$bd.on(''+start_ev+' '+move_ev+' '+end_ev+'',_eventHandler);
			$hd.children('li').on(c_ev,_eventClick);
			if(opts.auto){_setTimer()}
		},
		//设置样式
		_setStyle = function(){
			if (opts.maxWidth) {$this.css({ maxWidth: opts.maxWidth });}
			if (opts.type!=''){
				$hd.addClass(opts.type);
				$content.addClass(opts.type);	
			}
			minWidth=$this.width();
			$bd.children('div.tabSlider-box').each(function(index){
						$(this).css(C.TransformVal(index*minWidth));
					})
			var index=$bd.children('div.tabSlider-box.curr').index();
			if(index!=0){
				currentIndex=index;
				$bd.css(C.TransformVal('-'+index*minWidth));
			}
			_contentHeight();
		},
		//判定事件
		_eventHandler=function(e) {
			switch (e.type) {
				case move_ev:
					_touchMove(e);
					break;
				case start_ev:
					_touchStart(e);
					break;
				case end_ev:
					_touchEnd();
					break;
			}
		},
		_touchStart=function(e) {
			var point = e.touches ? e.touches[0] : e;
			if ($(e.target).closest($bd).length != 0) {
				offset=({
					pageX:      point.pageX,
					pageY:      point.pageY,
					X    :      0,
					Y    :      0
				});
				if(opts.auto) _clearTimer();
				$content.addClass('tabSlider-transition');
				isScrolling = undefined;
				moved=true;	
			}					 
		},
		_touchMove=function(e) {		
			if(!moved) return;			
			var point = e.touches ? e.touches[0] : e;			
			offset.X = point.pageX - offset.pageX;
			offset.Y = point.pageY - offset.pageY;
			if ( typeof isScrolling == 'undefined') {
				isScrolling = !!( isScrolling || Math.abs(offset.X) < Math.abs(offset.Y) );
			}
			if (moved && !isScrolling ) {
				$bd.css(C.TransformVal(offset.X-currentIndex*minWidth));
				e.preventDefault();
			}
		},
		_touchEnd=function() {
			if (!moved || isScrolling) return;
			var stepLength = offset.X <= -opts.threshold ? Math.ceil(-offset.X / minWidth) : (offset.X > opts.threshold) ? -Math.ceil(offset.X / minWidth) : 0;
			if(stepLength==1){
				if(currentIndex<$bd.children('div.tabSlider-box').length-1){currentIndex++;}	
			}else if (stepLength==-1){
				if(currentIndex>0){currentIndex--;}
			}			
			_switchTo();
			if(opts.auto) _setTimer();
			moved = false;				
			
		},
		// hd 单击事件
		_eventClick=function(){			
			currentIndex=$(this).index();
			_switchTo();			
		},
		// 跳转到指定区域
		_switchTo=function(){
			$bd.removeClass('tabSlider-transition').addClass('tabSlider-animate').css(C.TransformVal("-"+(minWidth*currentIndex)));
			_contentHeight();
			_nav();
		},
		//改变当前HD
		_nav=function(){
			$hd.children('li').eq(currentIndex).addClass('curr').siblings().removeClass('curr');
		},	
		//设置内容区域高度
		_contentHeight = function(){
			var h=$bd.children('div.tabSlider-box').eq(currentIndex).height();
			$content.css('height',h);	
			setTimeout(function(){C.scrollCurrent.scroller.refresh();},200);
		},
		//自动轮播
		_setTimer = function () {
			if (timer) _clearTimer();
			timer = setInterval(function () {					
				_switchTo(currentIndex >= $hd.children('li').length - 1 ? currentIndex=0 : currentIndex += 1);
			}, opts.spend)
		},
		//清除自动轮播
		_clearTimer = function () {
			clearInterval(timer);
			timer = null;
		}
	_init();
	$(window).resize(function(){C.Throttle(_setStyle(),50,30)});	
};
/**
 * Imglazyload 图片延迟加载
 * <div class="ui-imglazyload" data-url='images/pic/img/2.jpg'></div>
 */
C.Imglazyload = function(){
	if(!(typeof(C.history[0].imglazyload)==='undefined') && C.history[0].imglazyload){
		C.scrollCurrent=C.AppScroll(C.history[0].tag);
		var iscrolObj=C.scrollCurrent.scroller;
		iscrolObj.on('scrollEnd', function () {
					$.fn.imglazyload.detect();
				});
		$('.ui-imglazyload').imglazyload({
			container: $(C.history[0].tag).find('article.wrapper'),
			innerScroll: true
		}).on('loadcomplete', function () {
			iscrolObj.refresh();
		});
	}
};
/**
 * 返回顶部
 */
C.GoTop = function(options){
	var settings = {
			probeType : 3
		};
	$.extend(true,settings,options);
	var $wrapper;
	wrapper=C.history[0].tag;
	$wrapper=$(wrapper);
	C.scrollCurrent=C.AppScroll(wrapper,settings);
	var scrollObj=C.scrollCurrent.scroller,
		wheight=$(window).height()-$(wrapper).find('header').height()-$(wrapper).find('footer').height();
	scrollObj.on('scroll',function(){
			var top=this.y>>0;
			if(top<-wheight){
				if(!($(wrapper).find('div.app-gotop').length>0)){
					var isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),
						hasTouch = 'ontouchstart' in window && !isTouchPad,
						c_ev = hasTouch ? 'tap' : 'click';
					$(wrapper).find('article.wrapper>div.app-iscroll').append('<div class="app-gotop"><span><i class="iconfont icon-top iconfont-2x"></i></span></div>');
					$(wrapper).find('div.app-gotop').on(c_ev,function(){
							scrollObj.scrollTo(0,0,500);
					})
				}else{
					$(wrapper).find('div.app-gotop').css({'top':-top+wheight-80});
				}				
			}else{
				if(!($(wrapper).find('div.app-gotop').length>0)){
					$(wrapper).find('div.app-gotop').remove();
				}
			}
	});
};
/**
 * 上下拉动更新内容
 */
C.IscrollAssist = {

	/**
	 * 新建一个竖直滚动实例,并做一些处理,整合上拉下拉的功能
	 * pulldownAction 下拉执行的逻辑
	 * pullupAction   上拉执行的逻辑
	 * opts           滚动个性化参数 
	 * pullText       拉动时不同状态要显示的文字
	 */
	newVerScrollForPull : function(pulldownAction,pullupAction,opts,pullText){
		var $wrapper;
		wrapper=C.history[0].tag;
		$wrapper=$(wrapper);
		if($wrapper.data('pulldown') && typeof(C.history[0].refreshing)==='undefined'){
			return;
		}else{
			$wrapper.data('pulldown',true);
		}
		var pulldownRefresh   = pullText && pullText['pulldownRefresh'] ? pullText['pulldownRefresh'] : '下拉刷新...',
			pullupLoadingMore = pullText && pullText['pullupLoadingMore'] ? pullText['pullupLoadingMore'] : '上拉加载更多...',
			releaseToRefresh  = pullText && pullText['releaseToRefresh'] ? pullText['releaseToRefresh'] : '松手开始刷新...',
			releaseToLoading  = pullText && pullText['releaseToLoading'] ? pullText['releaseToLoading'] : '松手开始加载...',
			loading 		  = pullText && pullText['loading'] ? pullText['loading'] : '加载中...';
		var $article = $wrapper.children('article.wrapper').children('div.app-iscroll'),
			$pulldown = $('<div class="pullDown" />').prependTo($article),
			$pullup   = $('<div class="pullUp" />').appendTo($article),
			$pullDownIcon = $('<span class="pullDownIcon"></span>').appendTo($pulldown),
			$pullDownLabel = $('<span class="pullDownLabel">Pull down to refresh...</span>').appendTo($pulldown),
			$pullUpIcon = $('<span class="pullUpIcon"></span>').appendTo($pullup),
			$pullUpLabel = $('<span class="pullUpLabel">Pull up to refresh...</span>').appendTo($pullup),
			pullupOffset   = 0,
			pulldownOffset = 0;
		
		if($pulldown.length>0){
			pulldownOffset = $pulldown.height();
			$pullDownLabel.html(pulldownRefresh);
		}
		
		if($pullup.length>0){
			pullupOffset = $pullup.height();
			$pullUpLabel.html(pullupLoadingMore);
		}
		
		//这个属性很重要,目前V5版本不支持,需修改源码
		var options = {
			topOffset : pulldownOffset,
			useTransition : false,
			probeType : 3
		};
		
		$.extend(true,options,opts);
		C.scrollCurrent=C.AppScroll(wrapper,options);
		var scrollObj=C.scrollCurrent.scroller;
		
		//滚动刷新触发的事件		
		scrollObj.on('refresh',function(){			
			if ($pulldown.length>0 && $pulldown.hasClass('loading')) {
				$pulldown.removeClass('loading');
				$pullDownLabel.html(pulldownRefresh);
			} else if ($pullup.length>0){
				$pullUpIcon.show();
				if($pullup.hasClass('loading')){
					$pullUpIcon.show();
					$pullup.removeClass('loading');
					$pullUpLabel.html(pullupLoadingMore);
				}
			}
		});
		
		//滚动的时候触发的事件
		scrollObj.on('scroll',function(){
			
			if ($pulldown.length>0 && this.y > 5 && !$pulldown.hasClass('flip')) {
				$pulldown.addClass('flip');
				$pullDownLabel.html(releaseToRefresh);
				this.minScrollY = 0;
				
			} else if ($pulldown.length>0 && this.y < -($wrapper.children('header').height()/3) && $pulldown.hasClass('flip')) {
				$pulldown.removeClass('flip');
				$pullDownLabel.html(pulldownRefresh);
				this.minScrollY = -pulldownOffset;
			//this.y < this.minScrollY代表是上拉,以防下拉的时候未拉到尽头时进入上拉的逻辑中
			} else if ($pullup.length>0 && this.y < this.minScrollY && this.y < (this.maxScrollY - 5) && !$pullup.hasClass('flip')) {
				$pullup.addClass('flip');
				$pullUpLabel.html(releaseToLoading);
				this.maxScrollY = this.maxScrollY;
				
			} else if ($pullup.length>0 && (this.y > (this.maxScrollY + 5)) && $pullup.hasClass('flip')) {
				$pullup.removeClass('flip');
				$pullUpLabel.html(pullupLoadingMore);
			}
		});
		
		//滚动结束之后触发的事件
		scrollObj.on('scrollEnd',function(){
			
			if ($pulldown.length>0 && $pulldown.hasClass('flip')) {
				$pulldown.removeClass('flip').addClass('loading');
				$pullDownLabel.html(loading);
				if(typeof pulldownAction === 'function'){
					pulldownAction.call(scrollObj);	
				}
			} else if ($pullup.length>0 && $pullup.hasClass('flip')) {
				$pullup.removeClass('flip').addClass('loading');
				$pullUpLabel.html(loading);
				if(typeof pullupAction === 'function' && $pullup.parent().length>0){
					pullupAction.call(scrollObj);
				}				
			}
		});
		
		return scrollObj;
	}
};

/**
 * 弹出框组件
 */
C.Dialog={
	popup:null,
	mask:null,
	transition:null,
	clickMaskClose:null,
	hasDialogOpen:false,
	dialogTimer:null,
	position : {
		'top':{
			top:0,
			left:0,
			right:0
		},
		'top-second':{
			top:'45px',
			left:0,
			right:0
		},
		'center':{
			top:'50%',
			left:'10px',
			right:'10px',
			'border-radius' : '3px'
		},
		'bottom' : {
			bottom:0,
			left:0,
			right:0
		},
		'bottom-second':{
			bottom : '48px',
			left:0,
			right:0
		}
	},
	anim : {
		top : ['sliderDownIn','sliderUpOut'],
		bottom : ['sliderUpIn','sliderDownOut'],
		defaultAnim : ['bounceIn','bounceOut']
	},
	template : {
		alert : '<div class="dialog-title">{title}</div><div class="dialog-content">{content}</div><div id="dialog_btn_container"><a data-target="closeDialog" data-icon="checkmark">{ok}</a></div>',
		confirm : '<div class="dialog-title">{title}</div><div class="dialog-content">{content}</div><div id="dialog_btn_container"><a class="cancel" data-icon="close">{cancel}</a><a data-icon="checkmark">{ok}</a></div>',
		loading : '<i class="icon spinner"></i><p>{title}</p>',
		tips : {
            toast : '<div class="dialog-tips toast">{value}</div>',
            success : '<div class="dialog-tips success"><i class="iconfont icon-roundcheck"></i>{value}</div>',
            error : '<div class="dialog-tips error"><i class="iconfont icon-warn"></i>{value}</div>',
            info : '<div class="dialog-tips info"><i class="iconfont icon-info"></i>{value}</div>'
        }
	},
	events : function(){
		var isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),
			hasTouch = 'ontouchstart' in window && !isTouchPad,
			c_ev = hasTouch ? 'tap' : 'click';
		return c_ev
	},
	subscribeEvents : function(){
		var c_ev=this.events();
        this.mask.on(c_ev,function(){
            C.Dialog.clickMaskClose &&  C.Dialog.hide();
        });
        this.popup.on(c_ev,'[data-target="closeDialog"]',function(){C.Dialog.hide();});
    },
	show : function(options){
		//初始化
		if($('#app-dialog').length>0 || $('#app-dialog-mask').length>0){
			clearTimeout(this.dialogTimer);
			this.hide();
			setTimeout(function(){C.Dialog.show(options)},500)
			return false;
		}	
		
        this.mask = $('<div id="app-dialog-mask" />').appendTo($('body'));
        this.popup = $('<div id="app-dialog" />').appendTo($('body'));
        this.subscribeEvents();
		
		
		
        var settings = {
            height : undefined,//高度
            width : undefined,//宽度
            url : null,//远程加载url
            tplId : null,//加载模板ID
            tplData : null,//模板数据，配合tplId使用
            html : '',//内容
            pos : 'center',//位置 {@String top|top-second|center|bottom|bottom-second}   {@object  css样式}
            clickMaskClose : true,// 是否点击外层遮罩关闭
            showCloseBtn : true,// 是否显示关闭按钮
            arrowDirection : undefined,//popover的箭头指向
            animation : true,//是否显示动画
            timingFunc : 'ease',
            duration : 200,//动画执行时间
            onShow : undefined, //@event 在popup内容加载完毕，动画开始前触发,
			colseTime: 0, //自动关闭时间
			hideMask : false //是否显示外层遮罩
        }
        $.extend(settings,options);
        this.clickMaskClose = settings.clickMaskClose;
        //rest position and class
        this.popup.attr({'style':'','class':''});
        settings.width && this.popup.width(settings.width);
        settings.height && this.popup.height(settings.height);
        var pos_type = $.type(settings.pos);
        if(pos_type == 'object'){// style
            this.popup.css(settings.pos);
            this.transition = this.anim['defaultAnim'];
        }else if(pos_type == 'string'){
            if(this.position[settings.pos]){ //已经默认的样式
                this.popup.css(this.position[settings.pos])
                var trans_key = settings.pos.indexOf('top')>-1?'top':(settings.pos.indexOf('bottom')>-1?'bottom':'defaultAnim');
                this.transition = this.anim[trans_key];
            }else{// pos 为 class
                this.popup.addClass(settings.pos);
                this.transition = this.anim['defaultAnim'];
            }
        }else{
            console.error('错误的参数！');
            return;
        }
		if(!settings.hideMask){
			this.mask.show();
		}        
        var html;
        if(settings.html){
            html = settings.html;
        }else if(settings.url){//远程加载
            html = '' //J.Page.loadContent(settings.url);
        }else if(settings.tplId){//加载模板
            html = $(settings.tplId).html();
        }

        //是否显示关闭按钮
        if(settings.showCloseBtn){
            html += '<div id="tag-close-dialog" data-target="closeDialog" class=""><i class="iconfont icon-close"></i></div>';
        }
        //popover 箭头方向
        if(settings.arrowDirection){
            this.popup.addClass('arrow '+settings.arrowDirection);
            this.popup.css('padding','8px');
            if(settings.arrowDirection=='top'||settings.arrowDirection=='bottom'){
                this.transition = this.anim[settings.arrowDirection];
            }
        }		
        this.popup.html(html).show();
        
        //执行onShow事件，可以动态添加内容
        settings.onShow && settings.onShow.call(this.popup);

        //显示获取容器高度，调整至垂直居中
        if(settings.pos == 'center'){
            var height = this.popup.height();
            this.popup.css('margin-top','-'+height/2+'px')
        }
        if(settings.animation){
           C.Animation(this.popup,this.transition[0],settings.duration,settings.timingFunc);
        }
		// 自动关闭
		if(settings.colseTime>0){
			this.popup.addClass('tips');					
           	this.dialogTimer=setTimeout(function(){
			   		C.Dialog.hide();
			   },settings.colseTime);
        }		
        this.hasDialogOpen = true;
    },
	hide : function(noTransition){
        this.mask.remove();
		this.hasDialogOpen = false;
        if(this.transition && !noTransition){
            C.Animation(this.popup,this.transition[1],200,function(){
                C.Dialog.popup.remove();                
            });
        }else{			
            this.popup.remove();            
        }
    },
	/**
     * tips组件
     * @param value 内容
     * @param type 显示类型
	 * @param content 显示位置
	 * @param time 多少秒自动关闭
     */
	tips : function(value,type,content,time){
		var markup;
		switch(type)
		{
		case 'toast':
		  markup=this.template.tips.toast.replace('{value}',value || '提示语！');
		  break;
		case 'success':
		  markup=this.template.tips.success.replace('{value}',value || '数据提交成功！');
		  break;
		case 'error':
		  markup=this.template.tips.error.replace('{value}',value || '数据提交失败！');
		  break;
		case 'info':
		  markup=this.template.tips.info.replace('{value}',value || '欢迎使用WEBAPP框架！');
		  break;
		default:
		  markup=this.template.tips.toast.replace('{value}',value || '提示语！');
		}
		this.show({
            html : markup,
            pos : content,
            showCloseBtn : false,
			hideMask : true,
			colseTime : time
        });
	},
	/**
     * alert组件
     * @param title 标题
     * @param content 内容
     */
    alert : function(title,content,btnName){
        var markup = this.template.alert.replace('{title}',title).replace('{content}',content).replace('{ok}',btnName || '确定');
        this.show({
            html : markup,
            pos : 'center',
            clickMaskClose : false,
            showCloseBtn : false
        });
    },
	/**
     * confirm 组件
     * @param title 标题
     * @param content 内容
     * @param okCall 确定按钮handler
     * @param cancelCall 取消按钮handler
     */
	confirm : function(title,content,okCall,cancelCall){
        var markup = this.template.confirm.replace('{title}',title).replace('{content}',content).replace('{cancel}','取消').replace('{ok}','确定');
		var c_ev=this.events();
        this.show({
            html : markup,
            pos : 'center',
            clickMaskClose : false,
            showCloseBtn : false
        });
        $('#dialog_btn_container [data-icon="checkmark"]').on(c_ev,function(){
            C.Dialog.hide();
            okCall.call(this);
        });
        $('#dialog_btn_container [data-icon="close"]').on(c_ev,function(){
            C.Dialog.hide();
            cancelCall.call(this);
        });
    },
	/**
     * 带箭头的弹出框
     * @param html 弹出框内容
     * @param pos 位置
     * @param arrow_direction 箭头方向
     * @param onShow onShow事件
     */
	popover : function(html,pos,arrow_direction,onShow){
        this.show({
            html : html,
            pos : pos,
            showCloseBtn : false,
            arrowDirection : arrow_direction,
            onShow : onShow
        });
    },
	/**
     * loading组件
     * @param text 文本，默认为“加载中...”
     */
    loading : function(text){
        var markup = this.template.loading.replace('{title}',text||'加载中...');
        this.show({
            html : markup,
            pos : 'loading',
            opacity :.1,
            animation : false,
            clickMaskClose : false,
			showCloseBtn : false
        });
    },
	/**
     * actionsheet组件
     * @param buttons 按钮集合
     * [{color:'red',text:'btn',handler:function(){}},{color:'red',text:'btn',handler:function(){}}]
     */
    actionsheet : function(buttons){
        var markup = '<div class="actionsheet" style="margin:10px">';
		var c_ev=this.events();
        $.each(buttons,function(i,n){
            markup += '<div class="mt10"><button class="btn yellow full">'+ n.text +'</button></div>';
        });
        markup += '<div class="mt10"><button class="btn blue full">取消</button></div>';
        markup += '</div>';
        this.show({
            html : markup,
            pos : 'bottom',
            showCloseBtn : false,
            onShow : function(){
                $(this).find('button').each(function(i,button){
                    $(button).on(c_ev,function(){
                        if(buttons[i] && buttons[i].handler){
                            buttons[i].handler.call(button);
                        }
                        C.Dialog.hide();
                    });
                });
            }
        });
    }
};

/**
 * 完善zepto的动画函数,让参数变为可选
 */
C.Animation  =  function(el,animName,duration,ease,callback){
	var d,e,c;
	var len = arguments.length;
	for(var i = 2;i<len;i++){
		var a = arguments[i];
		var t = $.type(a);
		t == 'number'?(d=a):(t=='string'?(e=a):(t=='function')?(c=a):null);
	}	
	$(el).animate(animName,d||C.transitionTime,e||C.transitionTimingFunc,c);
};

})(Zepto);
