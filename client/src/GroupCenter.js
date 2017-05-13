import { Config } from './Config.js';
import { DataUtils } from "./DataUtils.js"
import { Group } from "./Group.js"


class GroupCenter {
    constructor() {
        GroupCenter._idCounter = 0;
        GroupCenter._topicCount = 0;
        GroupCenter._groups = [];
        GroupCenter._groupMap = {};
        GroupCenter.colors = d3.scale.category10();
    }

    static createGroup(name, type, color) {
        if(type == "Topic")
            var id = GroupCenter._topicCount++;
        else
            var id = GroupCenter._idCounter++;

        color = color == null ? GroupCenter.colors(id) : color;
        type = type == null ? "Group" : type;
        name = name == null ? type + "_" + id : name;

        var group = new Group(id, name, color, type);
        GroupCenter._groups.push(group);
        // GroupCenter._groupMap[id] = group;
        GroupCenter._groupMap[type+id] = group;
        return group;
    }

    static getGroupByID(id) {
        return GroupCenter._groupMap[id];
    }

    static getGroup(type, id) {
        return GroupCenter._groupMap[type+id];
    }

    static getGroupsByDocID(docID) {
        var groups = [];
        for (var group of GroupCenter._groups) {
            if (group.containsDoc(docID)) {
                groups.push(group);
            }
        }
        return groups;
    }

    static get groups() {
        return GroupCenter._groups;
    }

    static clearGroups() {
        GroupCenter._groups = [];
        GroupCenter._groupMap = {};
    }

    static removeGroups(removedGroups) {
        GroupCenter._groups = _.difference(GroupCenter._groups, removedGroups);
        for (var group of removedGroups) {
            var groupID = group.id;
            var groupType = group.type;
            delete(GroupCenter._groupMap[groupType+groupID]);
            if(group.type == "Topic")
                GroupCenter._topicCount--;
            else
                GroupCenter._idCounter--;
        }
    }

    static removeGroupsByType(type) {
        var removedGroups = _.filter(GroupCenter._groups, {type: type});
        GroupCenter.removeGroups(removedGroups);
    }
}

//For testing
window.GroupCenter = GroupCenter;

export { GroupCenter };
