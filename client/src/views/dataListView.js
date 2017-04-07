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
            this.data[i]._MAINTIME = date.toLocaleDateString().replace(/\//g, "-") + " " + date.toTimeString().substr(0, 8);     
        }
        console.log(this.data);

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

        this.keyword =  $(this.getContainer()).find("#keyword");
        this.textContent = $(this.getContainer()).find("#text-content");

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            _this.filteredData = FilterCenter.getFilteredDataByView(_this);
            _this.reRender();
        })   


        $(this.getContainer()).on("click", "#filter-btn", function() {
            var ids = _this.dataTable.rows({"filter":"applied"})[0];
            var selectedData = [];
            for (var i = 0; i < ids.length; i++) {
                selectedData.push(DataCenter.data[ids[i]]);
            }
            FilterCenter.addFilter(_this, selectedData);           
        })

        $(this.getContainer()).on("click", "#clear-btn", function() {
            _this.dataTable.search("").draw();
            FilterCenter.removeFilter(_this);
        })

        $(this.getContainer()).on("click", "#search-btn", function() {
            var word = _this.keyword.val();
            _this.textSearch(word);
        });
    }

    render () {
        var _this = this;
        var table = $(this.getContainer()).find("#data-table");

        var mainTimeField = DataCenter.fields._MAINTIME;
        var mainTextField = DataCenter.fields._MAINTEXT;

        this.dataLength = $(this.getContainer()).find("#data-length").html(this.data.length);

        this.dataTable = table.DataTable({
            data: this.data,
            searching: false,
            info: false,
            lengthchange: false,
            paging: false,
            columns: [
                {data: "_topic", title: "topic"},
                {data: "_MAINTIME", title: "time"},
                {data: "title", title: "title"}
                // {data: mainTextField, title: mainTextField}
            ]
        });
        this.textContent.html(this.data[0]["text"]); 

        $(this.getContainer()).on("mouseenter", "tr", function() {
            $(this).addClass("hover")
        })
        $(this.getContainer()).on("mouseout", "tr", function() {
            $(this).removeClass("hover")
        })   
        $(this.getContainer()).on("click", "tr", function() {
            _this.textContent.html(_this.dataTable.row(this).data()["text"]);
            var word = _this.keyword.val();
            if(word)
                _this.textSearch(word);

            if ($(this).hasClass("active"))
                $(this).removeClass("active");
            else
                $(this).addClass("active");
        })      
    }

    reRender() {
        this.dataTable.clear();
        this.dataTable.rows.add(this.filteredData);
        this.dataLength.html(this.filteredData.length);
        this.textContent.html(this.filteredData[0]["text"]); 
        this.dataTable.draw();
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
                alert("关键字为空"); 
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