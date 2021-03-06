var Datastore = require('nedb'),
  ndb = new Datastore(),
    samplecoll = null,
    arraySize = 10000,			// how large of a dataset to generate
    totalIterations = 200,	// how many times we search it
    results = [],
  gAsyncCount = 0,
  startTime,
  endTime,
  isIndexed = false;;
 
// not really using right now, if we need to time each op independently i might use this outside timing logic
function genRandomVal()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 20; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function initializeDB() {
  gAsyncCount = 0;
  
  startTime = process.hrtime();

  // nedb uses async callbacks so we will not time each operation but 
  // use globals to count when the last async op has finished
	for (var idx=0; idx < arraySize; idx++) {
   	var v1 = '12345'; //genRandomVal(); 
    var v2 = '23456'; //genRandomVal();
    
   	ndb.insert({ 
			customId: idx, 
			val: v1, 
			val2: v2, 
			val3: "more data 1234567890"
		}, function (err, newDoc) {   // Callback is optional
      if (++gAsyncCount == arraySize) {
        endTime = process.hrtime(startTime);
        var totalMS = endTime[0] * 1e3 + endTime[1] / 1e6;
        var rate = arraySize * 1000 / totalMS;
        rate = rate.toFixed(2);
        console.log("load (insert) : " + totalMS + "ms (" + rate + ") ops/s");
        
        testperfFind();
      }
    });
   }
}

// benchmark find() performance
// called by initializedb once its last async insert is complete
// This test runs once unindexed and on completion of all async ops it will add an index and run again
 function testperfFind() {
	var loopIterations = totalIterations;
  
  // if running indexed, the test will complete alot faster.  
  // Using a multiplier so that the test takes close to 1 second for more accurate rate calculation.
	if (isIndexed) {
		loopIterations = loopIterations * 200;
	}
	
  gAsyncCount = 0;
  
  startTime = process.hrtime();
  
	for (var idx=0; idx < loopIterations; idx++) {
    var customidx = Math.floor(Math.random() * arraySize) + 1;
        
    ndb.find({ customId: customidx }, function (err, docs) {
      ++gAsyncCount;
      
      if ((!isIndexed && gAsyncCount == totalIterations) || (isIndexed && gAsyncCount == totalIterations * 200) ) {
        endTime = process.hrtime(startTime);
        var totalMS = endTime[0] * 1e3 + endTime[1] / 1e6;
        var rate = (isIndexed?totalIterations*200:totalIterations) * 1000 / totalMS;
        rate = rate.toFixed(2);
        console.log("find (indexed : " + isIndexed + ") : " + totalMS + "ms (" + rate + ") ops/s");

        if (!isIndexed) {
          isIndexed = true;
          ndb.ensureIndex({ fieldName: 'customId' }, function (err) {
            testperfFind();
          });
        }
      }
    });
  }
}

initializeDB();

