/**
 * Requires: undersocre.js
 * 
 */

var DocTextProcessor = function() {
    var Processor = {};

    var data = {
        docNum: 0,// number of documents
        docs: [], // Array of docs, each doc is an array of words.
        termList: [], // Array of terms with a certain order.
        terms: {}, // Number of each term appears; 
        termFreqs: [], // Array, each element contains term freqs in each doc
        dted: {}, // Number of documents containing the term.
    };

    // var maxDims = 500;
    Processor.data = data;
    /**
     * set documents
     * @param docs: an array of string, each string is segmented words separated by spaces
     */

    Processor.setDocs = function(docs) {
        data.docs = [];
        data.docNum = docs.length;
        for (var i = 0; i < docs.length; i++) {
            var words = docs[i].split(" ");
            if (words[words.length-1] == "")
                words.pop();
            data.docs.push(words);
            for (var j = 0; j < words.length; j++) {
                if (!(words[j] in data.terms))
                    data.terms[words[j]] = 0;
                data.terms[words[j]]++;
            }
            data.termFreqs.push(getDocTF(words));
        }
        for (var term in data.terms) {
            data.termList.push(term);
        }
        // Processor.reduceDims();
    }

    // Processor.reduceDims = function() {
    //     var freqs = [];
    //     var countThreshold;
    //     for (var term in data.terms) {
    //         freqs.push(data.terms[term]);
    //     }
    //     freqs.sort(function(a, b) {return b - a});
    //     if (freqs.length > maxDims) {
    //         countThreshold = freqs[maxDims];
    //     }
    //     var newTermList = [];
    //     for (var i = 0; i < data.termList.length; i++) {
    //         var term = data.termList[i];
    //         if (data.terms[term] > countThreshold)
    //             newTermList.push(term);
    //     }
    //     data.termList = newTermList;
    // }

    /**
     * @return an array of vector, each vector is the tf-idf vector of a document.
     */
    Processor.getTFIDFVector = function() {
        // if (Processor.TFIDFVector != null)
        //     return Processor.TFIDFVector;
        computeDocFreq();
        var vectors = [];
        for (var i = 0; i < data.docNum; i++) {
            var vec = [];
            vectors.push(vec);
            for (var j = 0; j < data.termList.length; j++) {
                var term = data.termList[j];
                var tf = term in data.termFreqs[i] ? data.termFreqs[i][term] : 0;
                var idf = getIDF(term);
                vec.push(tf * idf);
            }
        }
        // Processor.TFIDFVector = vectors;
        return vectors;
    }

    /**
     * @return normalized vector
     */
    Processor.getNormalizdeVector = function(vector) {
        var v = [];
        var len = vector.length;
        var target = [];
        var vectorLength = 0.0;
        for (var i = 0; i < len; i++) {
            vectorLength += vector[i] * vector[i];
        }
        vectorLength = Math.sqrt(vectorLength);
        for (var i = 0; i < len; i++) {
            v[i] = vector[i] / vectorLength;
        }
        return v;
    }    

    /**
     * @return an array of vector, each vector is the normalized tf-idf vector of a document.
     */
    Processor.getNormalizedTFIDFVector = function(vector) {
        // if (Processor.normalizedTFIDFVector != null)
        //     return Processor.normalizedTFIDFVector;
        var vectors = this.getTFIDFVector();
        var target = [];
        for (var i = 0; i < vectors.length; i++) {
            target[i] = this.getNormalizdeVector(vectors[i]);
        }
        // Processor.normalizedTFIDFVector = target;
        return target;
    }      


    /**
     * @param an array of vectors (if not provided, will use tf-idf vectors)
     * @return similarity matrix, based on tf-idf
     */
    // Processor.getCosineSimilarity = function(vectors) {
    //     var matrix = [];
    //     for (var i = 0; i < data.docNum; i++) {
    //         matrix[i] = [];
    //         for (var j = 0; j < data.docNum; j++)
    //             matrix[i][j] = 0;
    //     }

    //     if (vectors == null)
    //         vectors = this.getTFIDFVector();
    //     for (var i = 0; i < data.docNum; i++) {
    //         for (var j = 0; j < i; j++) {
    //             var productSum = 0,
    //                 squareSum1 = 0,
    //                 squareSum2 = 0;

    //             var vec1 = vectors[i],
    //                 vec2 = vectors[j],
    //                 termLen = vec1.length;
    //             for (var k = 0; k < termLen; k++) {
    //                 productSum += vec1[k] * vec2[k];
    //                 squareSum1 += vec1[k] * vec1[k];
    //                 squareSum2 += vec2[k] * vec2[k];
    //             }
    //             var sim = productSum / (Math.sqrt(squareSum1) * Math.sqrt(squareSum2));
    //             if (isNaN(sim))
    //                 sim = 0;
    //             matrix[i][j] = matrix[j][i] = sim;
    //         }
    //     }
    //     return matrix;
    // }

    /**
     * @param an array of vectors (if not provided, will use tf-idf vectors)
     * @return Euler distance matrix, based on tf-idf
     */
    // Processor.getEulerDistancesMatrix = function(vectors) {
    //     var matrix = [];
    //     for (var i = 0; i < data.docNum; i++) {
    //         matrix[i] = [];
    //         for (var j = 0; j < data.docNum; j++)
    //             matrix[i][j] = 0;
    //     }

    //     if (vectors == null)
    //         vectors = this.getTFIDFVector();
    //     for (var i = 0; i < data.docNum; i++) {
    //         for (var j = 0; j < i; j++) {
    //             var distance = 0;
    //             var vec1 = vectors[i],
    //                 vec2 = vectors[j],
    //                 termLen = vec1.length;
    //             for (var k = 0; k < termLen; k++) {
    //                 distance += (vec1[k] - vec2[k]) * (vec1[k] - vec2[k]);
    //             }
    //             distance = Math.sqrt(distance);
    //             matrix[i][j] = matrix[j][i] = distance;
    //         }
    //     }
    //     // console.log(matrix)
    //     return matrix;
    // }

    /**
     * @param an array of document IDs
     * @param the size of returned top keywords
     * @param normalized, boolean, whether use normalized TFIDF vectors
     * @return top keywords, each is formed as {"word": xxx, "weight": xxx}
     */    
    Processor.getTopKeywordsByTFIDF = function(view, docIDs, size, normalized) {
        var allVectors = (normalized == true) ?
            Processor.getNormalizedTFIDFVector() :
            Processor.getTFIDFVector();
        var vectors = [];
        for (var i = 0; i < docIDs.length; i++) {
            if(view.viewID == "keywords-view")
                vectors.push(allVectors[i]);
            else{
                var docID = docIDs[i];
                vectors.push(allVectors[docID]);
            }
        }
        
        if (vectors.length == 0)
            return [];
        // console.log(vectors, size);
        var sum = [];
        for (var i = 0; i < vectors[0].length; i++)
            sum[i] = 0.00000000;
        for (var j = 0; j < vectors[0].length; j++) {
            var nonZeroCount = 0;
            for (var i = 0; i < vectors.length; i++) { 
                sum[j] += vectors[i][j];
                if (vectors[i][j] > 0.00000001) 
                    nonZeroCount++;
            }
            // //fake
            // if (docIDs.indexOf(23) >= 0 &&  docIDs.indexOf(20) >= 0 && docIDs.indexOf(19) >= 0
            //     && docIDs.indexOf(21) >= 0 && docIDs.indexOf(30) >= 0)
            //     sum[j] *= nonZeroCount;
            // if (data.termList[j] == "time" && nonZeroCount >= docIDs.length - 1 && docIDs.indexOf(29) >= 0)
            //     sum[j] *= 3;
        }

        var sortedPairs = _.orderBy(_.toPairsIn(sum), 1, 'desc');
        var topKeywords = [];

        // computeDocFreq();

        for (var i = 0; i < Math.min(size, sortedPairs.length); i++) {
            topKeywords.push({
                "word": data.termList[+sortedPairs[i][0]],
                "weight": +sortedPairs[i][1] / vectors.length,
                "count": data.dted[data.termList[+sortedPairs[i][0]]]["count"],
                "docs": data.dted[data.termList[+sortedPairs[i][0]]]["docs"]
            });
        }
        topKeywords.sort(function(a,b){  
            return b.weight - a.weight;  
        });

        return topKeywords;
    }

    /**
     * Get TF for one document.
     * @param words: an array of words
     * @return: a dict of {word: frequency}
     */
    function getDocTF(words) {
        return _.countBy(words, function(word) {
            return word;
        })
    }

    /**
     * Compute the number of documents where the each term appears.
     */
    function computeDocFreq() {
        var dted = data.dted;
        for (var i = 0; i < data.docNum; i++) {
            var terms = data.termFreqs[i];
            for (var term in terms) {
                if (!(term in dted)){
                    dted[term] = {
                        "term": term,
                        "count": 0,
                        "docs":[]
                    }
                }
                dted[term]["count"]++;
                dted[term]["docs"].push(i);
            }
        }
    }

    /**
     * Get IDF for the term.
     * @param term
     * @return idf
     */
    function getIDF(term) {
        return Math.log(data.docNum / (1 + data.dted[term]["count"])) / Math.log(10);
    }

    return Processor;
    
}
