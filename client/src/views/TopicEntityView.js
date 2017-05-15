import { BaseView } from "./BaseView.js"
import { DataUtils } from "../DataUtils.js"
import { DataCenter } from "../DataCenter.js"
import { FilterCenter } from "../FilterCenter.js"
import { GroupCenter } from "../GroupCenter.js"
import { Utils } from "../Utils.js"
import viewTemplate from "../../templates/views/topic-entity-view.html!text"

// ._ner.organization/name/place
class TopicEntityView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "topic-entity-view", viewTitle, viewTemplate, layout);
        this.entitys = new Set();
        window.TopicEntityView = this;
        this._init();
        this._initInteraction();
	}

    _init() {
        var _this = this;
        
        this.entitys.add("name");
        this.entitys.add("place");
        this.entitys.add("organization");
        
        console.log(_this.entitys);

        this.render();
        
        PubSub.subscribe("DataCenter.TopicModel.Update", function() {
            _this.topicModel = DataCenter.topicModel;
        })
        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            console.log(_this.entitys);
           	_this.render();
        })
    }

    _initInteraction(){
        var _this = this;
        $(this.getContainer()).on("click", ".entity", function(){
            PubSub.publish("KeywordMonitor.Add", {word: $(this).text()});
        })
        $(this.getContainer()).on("click", ".filter-btn", function(){
            var groupID = $(this).attr("group-id");
            if($(this).hasClass("active")){
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                FilterCenter.removeFilter(_this);
            } else {
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                $(this).addClass("active");
                var topic = _this.topicModel.getTopicByGroupID(groupID);
                var selectedData = [];
                for(var id in topic.belongs){
                    selectedData.push(DataCenter.data[id]);
                }
                FilterCenter.addFilter(_this, selectedData);
            }
        })
    }

    render() {
    	var _this = this;
        var docs = DataCenter.data;
        var tpl = swig.compile($(_this.viewTemplate).find("#topic-entity-template").html());
        var groups = _.filter(GroupCenter.groups, function(group) {
            return group.type == "Topic";
        })
        for (var entity of _this.entitys) {
            var entityDiv = "#entity-" + entity + "-list";
            console.log(entityDiv);
            $(_this.getContainer()).find(entityDiv).html("");
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var topic = this.topicModel.getTopicByGroupID(group.id);

                // var groupEntity = [];
                // // console.log(groupEntity, group, docs);
                // for (var docID of group.data) {
                //     if (groupEntity.length == 0) {
                //         for(var k = 0; k < docs[docID]["_ner"][entity].length; k++){
                //         	groupEntity.push({
                //             	"facet": docs[docID]["_ner"][entity][k],
                //             	"count": 1
                //         	})
                //         }
                //     } 
                //     else {
                //         for(var k = 0; k < docs[docID]["_ner"][entity].length; k++){
                //         	var flag = 0;
                //         	for (var j = 0; j < groupEntity.length; j++) {
                //         		if (docs[docID]["_ner"][entity][k] == groupEntity[j]["facet"]) {
                //                 	groupEntity[j]["count"]++;
                //                 	flag = 1;
                //             	}
                //             }
                //            	if(!flag){
                //         		groupEntity.push({
                //         			"facet": docs[docID]["_ner"][entity][k],
                //         			"count": 1
                //     			})
                //         	}  
                //         }
                //     }   
                // }
                // groupEntity.sort(function(a, b) {
                //     return b.count - a.count;
                // });
                // console.log(groupEntity);

                var map = {};
                var groupEntity = [];
                for(var docID of group.data){
                    for(var j = 0; j < docs[docID]["_ner"][entity].length; j++){
                        var facet = docs[docID]["_ner"][entity][j];
                        if(!map[facet]){
                            map[facet] = {
                                facet: facet,
                                count: 1
                            }
                            groupEntity.push(map[facet]);
                        }
                        else{
                            map[facet]["count"]++;
                        }
                    }
                }
                groupEntity.sort(function(a, b) {
                    return b.count - a.count;
                });
                console.log(groupEntity);

                var html = tpl({entity: entity, group: group, topic: topic, facets: groupEntity});
                $(_this.getContainer()).find(entityDiv).append(html);
            }
        }
    }
}

export { TopicEntityView }
