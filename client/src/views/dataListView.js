import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/data-list-view.html!text"

import "jquery-dataTables"
import "jquery-dataTables-css!css"

class DataListView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "data-list-view", viewTitle, viewTemplate, layout);
        window.DataListView = this;
        this._init();
        this.render();
    }

    _init() {
        var _this = this;

        this.data = DataCenter.data;
        this.filteredData = this.data;

        for(var i=0; i < this.data.length; i++){
            this.data[i]._topic = "<div class=\"topic-circle\" style=\"background: rgba(0, 0, 0, 0.3);\"></div>";
            var d = DataUtils.getDataByField(this.data[i], DataCenter.fields._MAINTIME);
            var date = new Date(d);
            this.data[i]._time = date.toLocaleDateString().replace(/\//g, "-") + " " + date.toTimeString().substr(0, 8);     
        }


        // PubSub.subscribe("DataCenter.TopicModel.Update", function(){
        //     for(var i=0; i<_this.data.length; i++){
        //         var groups = GroupCenter.groups;
        //         for(var g of groups){
        //             if(g.type != "Topic") continue;
        //             if(g.data.indexOf(i) >= 0){
        //                 _this.data[i]._topic =  "<div class=\"topic-circle\" style=\"background:" + g.color + ";\"></div>"
        //             }
        //         }
        //     }
        //     _this.reRender();
        // });

        PubSub.subscribe("ColorTypeChanged", function(msg, data){
            console.log("changed")
            for(var i=0; i<_this.data.length; i++){
                if(data == "normal")
                    _this.data[i]._topic = "<div class=\"topic-circle\" style=\"background: rgba(0, 0, 0, 0.3);\"></div>"
                else{
                    var groups = GroupCenter.groups;
                    for(var g of groups){
                        if(g.type != "Topic") continue;
                        if(g.data.indexOf(i) >= 0){
                            _this.data[i]._topic =  "<div class=\"topic-circle\" style=\"background:" + g.color + ";\"></div>"
                        }
                    }
                }
            }
            _this.reRender();
        });

        this.hightlightText =  $(this.getContainer()).find("#hightlight");
        this.textTime = $(this.getContainer()).find("#data-list-time");
        this.textTitle = $(this.getContainer()).find("#data-list-title");
        this.textContent = $(this.getContainer()).find("#data-list-content");

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            if(_this.filteredData != FilterCenter.getFilteredDataByView(_this)){
                _this.filteredData = FilterCenter.getFilteredDataByView(_this);
                _this.reRender();
            }
            // if(_this.filteredData.length != _this.data.length){
            //     setTimeout(function(){
            //         console.log("selected");
            //         _this.dataTable.$('tr').css('backgroundColor', '');
            //         var start = new Date().getTime();//起始时间
            //         for(var i=0; i<_this.filteredData.length; i++){
            //             var index = _this.dataTable.column(0).data().indexOf(_this.filteredData[i]["_index"]);
            //             _this.dataTable.$('tr:eq(' + index + ')').css('backgroundColor', '#1f77b4');
            //             var end = new Date().getTime();//接受时间
            //             console.log("all:",(end - start), "ms");//返回函数执行需要时间)
            //         }
            //     }, 1000)
            // }
            // else{
            //     console.log("cancel selected");
            //     _this.dataTable.$('tr').css('backgroundColor', '');
            // }
        })


        $(this.getContainer()).on("click", ".filter-btn", function() {
            if($(this).hasClass("active")){
                _this.dataTable.search("").draw();
                _this.dataLength.html(_this.filteredData.length);
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                FilterCenter.removeFilter(_this);
            }
            else {
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                $(this).addClass("active");
                var ids = _this.dataTable.rows({"filter":"applied"})[0];
                _this.dataLength.html(ids.length);
                var selectedData = [];
                for (var i = 0; i < ids.length; i++) {
                    selectedData.push(DataCenter.data[ids[i]]);
                }
                FilterCenter.addFilter(_this, selectedData);
            }        
        })

        this.hightlightText.change(function(){
            var word = _this.hightlightText.val();
            _this.textSearch(word);
        })


    }

    render () {
        var _this = this;
        var table = $(this.getContainer()).find("#data-table");

        var mainTimeField = DataCenter.fields._MAINTIME;
        var mainTextField = DataCenter.fields._MAINTEXT;

        this.dataTable = table.DataTable({
            data: this.data,
            // searching: false,
            info: false,
            lengthchange: false,
            paging: false,
            aoColumns:[
                {data: "_index", visible: false},
                {data: "_topic", title: "topic", sWidth: "1px"},
                {data: "_time", title: "time"},
                {data: "title", title: "title"},
                // {data: mainTextField, title: "text"}
            ],
        });
        // this.dataLength = $(this.getContainer()).find("#data-length").html(this.data.length);
        this.dataLength = $(this.getContainer()).find("#data-length");
        this.dataLength.html(this.dataTable.rows()[0].length);
        this.textTime.html(this.data[0]["_time"])
        this.textTitle.html(this.data[0]["title"])
        this.textContent.html(this.data[0][mainTextField]); 
        
        $(this.getContainer()).on("mouseenter", "tr", function() {
            $(this).addClass("hover")
        })
        $(this.getContainer()).on("mouseout", "tr", function() {
            $(this).removeClass("hover")
        })   
        $(this.getContainer()).on("click", "tr", function() {
            _this.textTime.html(_this.dataTable.row(this).data()["_MAINTIME"])
            _this.textTitle.html(_this.dataTable.row(this).data()["title"])
            _this.textContent.html(_this.dataTable.row(this).data()[mainTextField])

            var word = _this.hightlightText.val();
            if(word)
                _this.textSearch(word);

            if ($(this).hasClass("active"))
                $(this).removeClass("active");
            else
                $(this).addClass("active");
        })

        this.searchText = $(this.getContainer()).find("input[type='search']");
        this.searchText.change(function(){
            _this.dataLength.html(_this.dataTable.rows({"filter":"applied"})[0].length);
            var word = _this.searchText.val();
            _this.hightlightText.val(word);
            _this.textSearch(word);
        })     
    }

    reRender() {
        this.dataLength.html(this.filteredData.length);
        this.dataTable.clear();
        this.dataTable.rows.add(this.filteredData);
        this.dataTable.draw();
        this.textTime.html(this.filteredData[0]["_time"]);
        this.textTitle.html(this.filteredData[0]["title"]);
        this.textContent.html(this.filteredData[0][DataCenter.fields._MAINTEXT]);     
    }

    textSearch(str, options){
        var _this = this;
        var defaults = {
            divFlag: true,
            divStr: " ",
            markClass: "",
            markColor: "red",
            nullReport: true,
            callback: function(){
                return false;   
            }
        };
        var sets = $.extend({}, defaults, options || {}), clStr;
        if(sets.markClass){
            clStr = "class='"+sets.markClass+"'";   
        }else{
            clStr = "style='color:"+sets.markColor+";'";
        }
        
        //对前一次高亮处理的文字还原     
        $("span[rel='mark']").each(function() {
            var text = document.createTextNode(_this.textContent.text()); 
            _this.textContent.html(text);
        });
        
        //字符串正则表达式关键字转化
        $.regTrim = function(s){
            var imp = /[\^\.\\\|\(\)\*\+\-\$\[\]\?]/g;
            var imp_c = {};
            imp_c["^"] = "\\^";
            imp_c["."] = "\\.";
            imp_c["\\"] = "\\\\";
            imp_c["|"] = "\\|";
            imp_c["("] = "\\(";
            imp_c[")"] = "\\)";
            imp_c["*"] = "\\*";
            imp_c["+"] = "\\+";
            imp_c["-"] = "\\-";
            imp_c["$"] = "\$";
            imp_c["["] = "\\[";
            imp_c["]"] = "\\]";
            imp_c["?"] = "\\?";
            s = s.replace(imp,function(o){
                return imp_c[o];                       
            }); 
            return s;
        };

        this.textContent.each(function(){
            var t = _this.textContent;
            str = $.trim(str);
            if(str === ""){
                // alert("关键字为空"); 
                return false;
            }else{
                //将关键字push到数组之中
                var arr = [];
                if(sets.divFlag){
                    arr = str.split(sets.divStr);   
                }else{
                    arr.push(str);  
                }
            }
            var v_html = t.html();
            //删除注释
            v_html = v_html.replace(/<!--(?:.*)\-->/g,"");
            
            //将HTML代码支离为HTML片段和文字片段，其中文字片段用于正则替换处理，而HTML片段置之不理
            var tags = /[^<>]+|<(\/?)([A-Za-z]+)([^<>]*)>/g;
            var a = v_html.match(tags), test = 0;
            $.each(a, function(i, c){
                if(!/<(?:.|\s)*?>/.test(c)){//非标签
                    //开始执行替换
                    $.each(arr,function(index, con){
                        if(con === ""){return;}
                        var reg = new RegExp($.regTrim(con), "g");
                        if(reg.test(c)){
                            //正则替换
                            c = c.replace(reg,"♂"+con+"♀");
                            test = 1;
                        }
                    });
                    c = c.replace(/♂/g,"<span rel='mark' "+clStr+">").replace(/♀/g,"</span>");
                    a[i] = c;
                }
            });
            //将支离数组重新组成字符串
            var new_html = a.join("");
            t.html(new_html);
            
            if(test === 0 && sets.nullReport){   
                return false;
            }          
            //执行回调函数
            sets.callback();
        });
    }
}

export { DataListView };