var RandIndexSort = function() {
    var randIndexSort = {}; 

    var minDistSum = 99999999.99;
    var minPermutation;

    randIndexSort.idList = [];
    randIndexSort.clusters = [];
    randIndexSort.setData = function(idList, clusters) {
        randIndexSort.idList = idList;
        randIndexSort.clusters = clusters;
    };

    randIndexSort.getOrder = function() {
        return getMinDistArrangement(randIndexSort.idList, 
            randIndexSort.clusters);
    }

    function cx2(x) {
        if (x < 2) {
            return 0;
        }
        return x*(x-1)/2;
    }
        
    function getTwoClustersDist(cluster1, cluster2) {
        var clusterNum = cluster1.length;
        var map = {};
        for (var i = 0; i < clusterNum; ++i) {
            for (var j = 0; j < cluster1[i].length; ++j) {
                map[cluster1[i][j]] = i;
            }
        }
        var cluster2MarkDistribution = new Array();
        var tp_plus_fp = 0;
        var tp = 0;
        for (var i = 0; i < clusterNum; ++i) {
            var oneSetMarkDistribution = new Array();
            for (var j = 0; j < clusterNum; ++j) {
                oneSetMarkDistribution[j] = 0;
            }
            for (var j = 0; j < cluster2[i].length; ++j) {
                ++oneSetMarkDistribution[map[cluster2[i][j]]];
            }
            tp_plus_fp += cx2(cluster2[i].length);
            for (var j = 0; j < clusterNum; ++j) {
                tp += cx2(oneSetMarkDistribution[j]);
            }
            cluster2MarkDistribution[i] = oneSetMarkDistribution;
        }
        var fp = tp_plus_fp - tp;
        var fn = 0;
        var tn_plus_fn = 0;
        for (var i = 0; i < clusterNum; ++i) {
            for (var j = i+1; j < clusterNum; ++j) {
                for (var k = 0; k < clusterNum; ++k) {
                    fn += cluster2MarkDistribution[i][k] * cluster2MarkDistribution[j][k];
                }
                tn_plus_fn += cluster2[i].length * cluster2[j].length;
            }
        }
        var tn = tn_plus_fn - fn;
        return 1.0 - (tp + tn) / (tp_plus_fp + tn_plus_fn);
    }

    function calAllPermutationDistSum(distMatrix, nowDistSum, restNum, candidatesNum, candidatesUsed, lastChose, nowPermutation) {
        if (restNum == 0) {
            if (nowDistSum < minDistSum) {
                minDistSum = nowDistSum;
                minPermutation = nowPermutation.slice(0);
                // console.log("minDistSum "+nowDistSum);
                // console.log(nowPermutation);
            }
            return;
        }
        for (var i = 0; i < candidatesNum; ++i) {
            if (!candidatesUsed[i]) {
                candidatesUsed[i] = true;
                var newDistSum = nowDistSum;
                if (lastChose != -1) {
                    newDistSum += distMatrix[lastChose][i];
                }
                nowPermutation.push(i);
                calAllPermutationDistSum(distMatrix, newDistSum, restNum-1, candidatesNum, candidatesUsed, i, nowPermutation);
                candidatesUsed[i] = false;          
                nowPermutation.pop();
            }
            
        }
    }

    function getMinDistArrangement(idList, clusters) {
        var distMatrix = new Array();
        for (var i = 0; i < clusters.length; ++i) {
            var distMatrixLine = new Array();
            for (var j = 0; j < clusters.length; ++j) {
                if (j < i) {
                    distMatrixLine[j] = distMatrix[j][i];
                } else if (j == i) {
                    distMatrixLine[j] = 0;
                } else {
                    distMatrixLine[j] = getTwoClustersDist(clusters[i], clusters[j]);
                }
            }
            distMatrix[i] = distMatrixLine;
        }
        var candidatesUsed = new Array();
        for (var i = 0; i < clusters.length; ++i) {
            candidatesUsed[i] = false;
        }
        var nowPermutation = new Array();
        calAllPermutationDistSum(distMatrix, 0.0, clusters.length, clusters.length, candidatesUsed, -1, nowPermutation);
        return minPermutation;
    }    



    return randIndexSort;
};