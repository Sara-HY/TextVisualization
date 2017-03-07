import { Config } from './Config.js';
import { DataUtils } from "./DataUtils.js";
import { Group } from "./Group.js";
import { GroupCenter } from "./GroupCenter.js";


class TopicModel {
    constructor(data, idMap) {
        this.idMap = idMap;
        this.probThreshold = 0.4;
        this.topics = [];   //topics[i].words, topics[i].docs;
        this.docs = [];
        this.groups = [];
        this._topicGroupMap = {};
        this._groupTopicMap = {};

        var wordTopic = data["word-topic"];
        var docTopic = data["doc-topic"];

        for (var i = 0; i < wordTopic.length; i++) {
            var topic = wordTopic[i];
            this.topics.push({
                "id": i,
                "words": topic,
                "docs": [],
                "belongs": [],
                "quality": 0
            });
        }

        for (var i = 0; i < docTopic.length; i++) {
            var doc = docTopic[i];
            doc.id = this._mapID(doc.id);
            this.docs.push(doc);
            var distribution = doc.distribution;
            var maxProb = 0;
            var belongTopic = -1;
            for (var j = 0; j < distribution.length; j++) {
                this.topics[j].docs[i] = distribution[j];
                if (distribution[j] > maxProb) {
                    maxProb = distribution[j];
                    belongTopic = j;
                }
            }
            this.topics[belongTopic].belongs.push([doc.id, maxProb]);
        }

        //对belongs排序
        for (var i = 0; i < this.topics.length; i++) {
            var belongs = this.topics[i].belongs;
            belongs = _.sortBy(belongs, function(d) { return -d[1] })
            belongs = _.map(belongs, function(d) {return d[0]});
            this.topics[i].belongs = belongs;
        }

        for (var i = 0; i < this.topics.length; i++) {
            var topic = this.topics[i];
            var belongs = topic.belongs;
            var quality = 0;
            for (var docID of belongs) {
                var doc = null;
                if (this.idMap != null) {
                    doc = _.find(this.docs, {id: docID});
                } else 
                    doc = this.docs[docID];
                
                quality += doc.distribution[i];
            }
            topic.quality = quality / belongs.length;
        }

        // PubSub.publish("DataCenter.TopicModel.Update", this);
        // PubSub.publish("GroupCenter.Groups.Update");
    }

    getTopicByTopicID(topicID) {
        for (var topic of this.topics) {
            if (topic.id == topicID)
                return topic;
        }
        return null;
    }

    getGroupByTopicID(topicID) {
        var groupID = this._topicGroupMap[topicID];
        return GroupCenter.getGroupByID(groupID);
    }

    getTopicByGroupID(groupID) {
        var topicID = this._groupTopicMap[groupID];
        return this.topics[topicID];
    }

    pullToGroups() {
        GroupCenter.removeGroupsByType("Topic");
        for (var i = 0; i < this.topics.length; i++) {
            var topic = this.topics[i];
            var group = GroupCenter.createGroup("Topic_" + i, "Topic");
            // var docs = [];
            // for (var j = 0; j < topic.docs.length; j++) {
            //     if (topic.docs[j] > this.probThreshold)
            //         docs.push(j);
            // }
            // group.updateData(docs);
            group.updateData(topic.belongs)
            this._topicGroupMap[topic.id] = group.id;
            this._groupTopicMap[group.id] = topic.id;
        } 
    }

    // createGroups() {
    //     this.groups = [];
    //     for (var i = 0; i < this.topics.length; i++) {
    //         var topic = this.topics[i];
    //         var id = i;
    //         var group = new Group(id, "topic_" + id, GroupCenter.colors(id));
    //         this.groups.push(group);
    //         group.updateData(topic.belongs);
    //         this._topicGroupMap[topic.id] = group.id;
            
    //     }        
    // }


    _mapID(id) {
        if (this.idMap != null) {
            return this.idMap[id];
        } else 
            return id;
    }
}


export {
    TopicModel
};
