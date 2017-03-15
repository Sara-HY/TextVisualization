import {BaseView} from "./BaseView.js"
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/facets-view.html!text"


class FacetsView extends BaseView {
	constructor(viewID, viewTitle, layout, config){
		super(viewID, "facets-view", viewTitle, viewTemplate, layout);
		window.FacetsView = this;
		this._init();
	}

	_init(){
		var _this = this;
		PubSub.subscribe("DataCenter.TopicModel.Update", function(){
			_this.topicModel = DataCenter.topicModel;
		})	
		PubSub.subscribe("GroupCenter.Groups.Update", function(){
			_this.renderGroup();
			// _this.render();
		})
	}

    renderGroup() {    
        var _this = this;
        var docs = DataCenter.data;
        var tpl = _.template($(_this.viewTemplate).find("#facets-template").html())
        var groups = _.filter(GroupCenter.groups, function(group) {
                return group.type == "Topic";
            });
        $(this.getContainer()).html("");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var topic = _this.topicModel.getTopicByGroupID(group.id);

           //  var groupSites = [];
           //  for (var docID of group.data) {
           //  	if(groupSites.length == 0){
           //  		groupSites.push({
           //  			"site": docs[docID]["site"],
           //  			"count": 1
           //  		});
           //  	}
           //  	else{
           //  		var flag = 0;
        		 //    for(var j = 0; j < groupSites.length; j++){
		        	// 	if(docs[docID]["site"] == groupSites[j]["site"]){
		        	// 		groupSites[j]["count"]++;
		        	// 		flag = 1;
		        	// 	}
		        	// }
		        	// if(flag == 0){
		        	// 	groupSites.push({
		        	// 		"site": docs[docID]["site"],
		        	// 		"count": 1
		        	// 	});
		        	// }
           //  	}
           //  }
            
            //map 
            var map = {};
			var groupSites = [];
            for(var docID of group.data){
            	var site = docs[docID]["site"];
			  	if(!map[site]){
			    	map[site] = {
			      		site: site,
			     		count: 1
			    	}
			    	groupSites.push(map[site]);
			  	}
			  	else{
			      	map[site]["count"]++;
			  	}
          	}
          	

            groupSites.sort(function(a,b){  
        		return b.count - a.count;  
    		});
    		// console.log("groupSites", groupSites);
            var html = tpl({group: group, topic: topic, sites: groupSites});
            $(_this.getContainer()).append(html);
        }
	}

	render() {
		var docs = DataCenter.data;	

	}
}

export { FacetsView };


