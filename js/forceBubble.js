const dflt = {
  width: 940,
  height: 600,
}

function bubbleForce(config){

  // Sizing 
  if (isNaN(config)){
    config = {};
  }
  const width = isNaN(config.width) ? dflt.width : config.width;
  const height = isNaN(config.height) ? dflt.height : config.height;

  // DOM selectors and list of nodes to display
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // strength to apply to the position forces
  var forceStrength = 0.03;

  /*
  * Locations to move bubbles towards, depending
  * on which view mode is selected.
  */
  var center = { x: width / 2, y: height / 2 };
  var dateCenter = null; // defined in createNodes(), provide x value for each date

  /*
   * Provides a x value for each node to be used with the split by date
   * x force.
   */
  function nodeDatePos(d) {
    console.log(d)
    console.log(d.date)
    console.log(dateCenter(d.date))
    return dateCenter(d.date);
  }

  /*
  * Charge function that is called for each node.
  * As part of the ManyBody force.
  * This is what creates the repulsion between nodes.
  */
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength;
  }

   /*
   * Repositioning of the SVG circles§
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
    bubbles
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });
  }

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   */
  function createNodes(rawData) {
    
    rawData = rawData.filter(function(d) { return +d.retweets > 1200 })

    console.log(rawData.length);

    // Scale values
    var maxValue = d3.max(rawData, function (d) { return +d.retweets; });
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 30])
      .domain([1200, maxValue]);

    // Scale dates
    var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
    var domain = d3.extent(rawData.map(function (d) {return parseDate(d.date); }));
    console.log("Domain", domain)
    dateCenter = d3
      .scaleTime()
      .range([200, width-200])
      .domain(domain)
      .nice()

    // transform to nodes
    var myNodes = rawData.map(function (d) {
      return {
        id: d.tweet_id,
        radius: radiusScale(+d.retweets),
        retweets: +d.retweets,
        likes: +d.likes,
        followers: +d.followers,
        user_name: d.user_name,
        date: parseDate(d.date),
        text: d.text,
        isRetweet: d.retweet_from_username,
        x: Math.random() * width,
        y: Math.random() * height
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.retweets - a.retweets; });

    return myNodes;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  //  Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme
  var fillColor = d3.scaleOrdinal()
    .domain(['low', 'medium', 'high'])
    .range(['#d84b2a', '#beccae', '#7aa25c']);


  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      //.on('mouseover', showDetail)
      //.on('mouseout', hideDetail);

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();
  };

    /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    //hideYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    //showYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('x', d3.forceX().strength(0.08).x(nodeDatePos));
    simulation.force('y', d3.forceY().strength(0.08).y(center.y));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

    /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'year') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleForce();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('data/police|policier_tweets.csv', display);

// setup the buttons.
setupButtons();