import {Config} from './Config.js';

class DataUtils {
    static queryToServer(url, data, type) {
        if (!url.includes("//"))
            url = Config.serverUrl + url;
        return new Promise((resolve) => {
            $.ajax({
                url: url,
                data: (data != null) ? data : {},
                type: (type != null) ? type : "GET"
            }).done(function(d) {
                resolve(d);
                return d;
            })                
        })
    }

    static getDataByField(data, field) {
        var fields = field.split("．");
        var d = data;
        for (var i = 0; i < fields.length; i++) {
            if (d == null)
                return null;    
            var test = d[fields[i]]
            d = d[fields[i]];
        }
        return d;
    }

    static getTopKeywordsInDocs(docs, wordSize) {
        var size = wordSize || 5;
        var segWords = [];        
        for (var doc of docs) {
            var segmentation =  doc[DataCenter.fields._SEGMENTATION];
            segWords = _.concat(segWords, segmentation.split(" "));
        }
        var pairs = _.toPairs(_.countBy(segWords));
        var sortedPairs = _.sortBy(pairs, function(d) {
            return -d[1];
        })
        var words = _.map(_.slice(sortedPairs, 0, Math.min(size, sortedPairs.length)), function(d) {
            return {"word": d[0], "weight": d[1]};
        });
        return words;      
    }

    static getDistMatrixByTFIDF() {
        var segmentedDocs = _.map(DataCenter.data, function(doc) {
            return doc[DataCenter.fields._SEGMENTATION]
        })
        var processor = new DocTextProcessor();
        processor.setDocs(segmentedDocs);
        var matrix = processor.getCosineSimilarity();
        for (var i = 0; i < matrix.length; i++) {
            for (var j = 0; j < i; j++) {
                if (i != j) {
                    matrix[i][j] = matrix[j][i] = 1 - Math.sqrt(Math.sqrt(matrix[i][j]));
                }
            }
        }
        return matrix;
    }

    static getDistMatrixByTopicModel(model) {
        var matrix = [];
        var docs = DataCenter.data;
        var models = DataCenter.topicModels;
        for (var i = 0; i < docs.length; i++) {
            matrix[i] = [];
            for (var j = 0; j < docs.length; j++)
                matrix[i][j] = 0;
        }
        for (var i = 0; i < docs.length; i++) {
            for (var j = i + 1; j < docs.length; j++) {
                var dij = 0, dji = 0;
                var probs1 = model.docs[i].distribution;
                var probs2 = model.docs[j].distribution;
                for (var p = 0; p < probs1.length; p++) {
                    dij += probs1[p] * Math.log(probs1[p] / probs2[p]);
                    dji += probs2[p] * Math.log(probs2[p] / probs1[p]);
                }
                var value = (dij + dji) / 2;
                matrix[i][j] = value;
                matrix[j][i] = value;
            }
        }
        return matrix;        
    }
}


export { DataUtils };