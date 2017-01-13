import uiModules from 'ui/modules';
import errors from 'ui/errors';	
import moment from 'moment';

// get the kibana/table_vis module, and make sure that it requires the "kibana" module if it
// didn't already
const module = uiModules.get('kibana/vr_vis', ['kibana']);


module.controller('PieController', function($scope, $rootScope, $element, Private){

  var filterManager = Private(require('ui/filter_manager'));

  var dash, containerpie, scenepie, camerapie, rendererpie;

  $scope.pie = null;
  $scope.slices=[];

  //esResponse holds the result of the elasticSearch query
  //resp is the actual value of esResponse
  $scope.$watch('esResponse', function(resp) {
    //if user has eliminated aggregations, return
    if (!resp) {
      $scope.slices = null;
      return;
    }

    //if slices aggregation exists, that is, user has configured it
    if ($scope.vis.aggs.bySchemaName['slices']) {

      // Retrieve the id of the configured tags aggregation
      var slicesAggId = $scope.vis.aggs.bySchemaName['slices'][0].id;

      // Retrieve the metrics aggregation configured
      var metricsAgg = $scope.vis.aggs.bySchemaName['slice_size'][0];

      // Get the buckets of that aggregation
      var buckets = resp.aggregations[slicesAggId].buckets;

      // Transform all buckets into tag objects
      $scope.slices = buckets.map(function(bucket) {
        // Use the getValue function of the aggregation to get the value of a bucket
        var value = metricsAgg.getValue(bucket);

        //if field we are representing is a date field
        if($scope.vis.aggs.bySchemaName['slices'][0]._opts.type.includes("date")){

          return {
            key: bucket.key_as_string,
            value: value
            };
        }
        else{
          return{
            key:bucket.key,
            value: value

          }
        }
      });

      if ($scope.pie){
        $scope.pie.data($scope.slices);
        $scope.pie.reBuild();
      } else {

      //redibujar pie con los nuevos datos
      $scope.pie = dash.pieChart();
      $scope.pie
        .data($scope.slices)
        .addCustomEvents(filter)
        .radius(50)
        .color(0xffaa00);

      $scope.pie.render();
    }
}

  });


initpie();

// animation loop / game loop
animatepie();

///////////////
// FUNCTIONS //
///////////////

//add Kibana filters when clicking on a slice
var filter = function(mesh) {

  dash.domEvents.bind(mesh, 'mousedown', function(object3d){ 

  //if field I clicked on is a date filed
  if ($scope.vis.aggs.bySchemaName['slices'][0]._opts.type.includes("date")){
    
    var from = moment(mesh.data.key);
    var interval = moment($scope.slices[1].key) - moment($scope.slices[0].key);
    var to = moment(from).add('ms', interval);

    $rootScope.$$timefilter.time.from = from;
    $rootScope.$$timefilter.time.to = to;
    $rootScope.$$timefilter.time.mode = 'absolute';

  } else {
    filterManager.add(
    // The field to filter for, we can get it from the config
    $scope.vis.aggs.bySchemaName['slices'][0].params.field,
    // The value to filter for, we will read out the bucket key
    //$scope.slices[0].key,
    mesh.data.key,
    // Whether the filter is negated. If you want to create a negated filter pass '-' here
    null,
    // The index pattern for the filter
    $scope.vis.indexPattern.title
    );
  }
  });
  };


function initpie () {

   var idchart = $element.children().find(".chartpie");
   ///////////
   // SCENE //
   ///////////
   scenepie = new THREE.Scene();

   ////////////
   // CAMERA //
   ////////////
   // set the view size in pixels (custom or according to window size)
   var SCREEN_WIDTH = 400 + 468.52 - 25;
   var SCREEN_HEIGHT = 400 + 178.89 - 25;
   // camera attributes
   var VIEW_ANGLE = 45;
   var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
   var NEAR = 0.1;
   var FAR = 20000;
      // set up camera
   camerapie = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
   // add the camera to the scene
   scenepie.add(camerapie);
   // the camera defaults to position (0,0,0)
   //    so pull it back (z = 400) and up (y = 100) and set the angle towards the scene origin
   camerapie.position.set(0,150,400);
   camerapie.lookAt(scenepie.position);

   //////////////
   // RENDERER //
   //////////////
   rendererpie = new THREE.WebGLRenderer( {antialias:true} );
   rendererpie.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
   rendererpie.setClearColor( 0xffffff );
   containerpie = idchart[0];
   containerpie.appendChild(rendererpie.domElement);


   ///////////
   // LIGHT //
   ///////////
   var light = new THREE.PointLight(0xffffff,0.8);
   light.position.set(0,200,250);
   scenepie.add(light);
   var ambientLight = new THREE.AmbientLight(0x111111);


  //create new dash object containing all variables needed for the scene
  dash = THREEDC({}, camerapie,scenepie,rendererpie, containerpie);

}

function animatepie()
{
   requestAnimationFrame( animatepie );
   renderpie();
   updatepie();
}

function renderpie()
{
   rendererpie.render( scenepie, camerapie );
}

function updatepie()
{
  dash.controls.update();
}

});