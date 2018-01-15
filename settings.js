var currentRepoFilter = [];
var currentPointFilter = [];
var currentDirFilter = [];

function colorStem() {
  $("#colorStemCheckbox").prop("checked", !$("#colorStemCheckbox").prop("checked"));
  svg.selectAll(".flyer")
    .style("stroke", function (d) { return chooseColor(d) })
  refresh();
}

function setPoints(o1,o2) {
  svg.selectAll(".point").style("opacity", o1);
  svg.selectAll(".label").style("opacity", o2);
}

// Update globe and repo filter array
function selectRepoFilter(f) {
  if($("#checkmark" + f).length === 0) {
    $("#filter" + f).html(f + '<i id=checkmark' + f + ' class="fa fa-check checkmark"></i>');
    currentRepoFilter.push(f);
  }
  else {
    $("#checkmark" + f).remove();
    currentRepoFilter.splice(currentRepoFilter.indexOf(f),1);
  }

  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
}

// Update direction filter and globe
function selectDirFilter(dir) {
  if($("#checkmarkDir" + dir).length === 0) {
    $("#dir" + dir).html(dir + '<i id=checkmarkDir' + dir + ' class="fa fa-check checkmark"></i>');
    currentDirFilter.push(dir);
  }
  else {
    $("#checkmarkDir" + dir).remove();
    currentDirFilter.splice(currentDirFilter.indexOf(dir),1);
  }

  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
}

// Update point filter and globe
function filterPoint(p) {
  var needToRotate = false;
  if($("#checkmarkPoint" + p).length === 0) {
    $("#point" + p).html(p + '<i id=checkmarkPoint' + p + ' class="fa fa-check checkmark"></i>');
    currentPointFilter.push(p);
    needToRotate = true;
  }
  else {
    $("#checkmarkPoint" + p).remove();
    currentPointFilter.splice(currentPointFilter.indexOf(p),1);
  }

  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
  if(needToRotate) {
    rotateToPoint(p);
  }
}

function resetFilters() {
  $(".checkmark").remove();

  currentRepoFilter = [];
  currentPointFilter = [];
  currentDirFilter = [];

  $("#pointSearch")[0].value = "";
  filterSearchPoints();

  $("#pointCheckbox").prop("checked", false);
  $("#fullDepthCheckbox").prop("checked", false);
  $("#toggleShadowsCheckbox").prop("checked", true);
  $("#colorStemCheckbox").prop("checked", true);
  $("#unknownStemCheckbox").prop("checked", true);

  $("#stemFilterSlider").attr("value", 0);
  $("#stemFilterCount").attr("value", 0);

  svg.selectAll(".flyer")
    .style("stroke", function (d) { return chooseColor(d) })

  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
}

function filterArc(s,t) {
  for(var i = 0; i < svg.selectAll(".arc")._groups[0].length; i++) {
    if(svg.selectAll(".arc")._groups[0][i].getAttribute("sourceTag") === s && svg.selectAll(".arc")._groups[0][i].getAttribute("targetTag") === t) {
      svg.selectAll(".arc")._groups[0][i].setAttribute("opacity", 0);
      break;
    }
  }
}

function filterArcsAndFlyers() {
  if($("#toggleShadowsCheckbox").prop("checked")) {
    for(var i = 0; i < svg.selectAll(".arc")._groups[0].length; i++) {
      svg.selectAll(".arc")._groups[0][i].setAttribute("opacity",1);
    }
  }
  else {
    for(var i = 0; i < svg.selectAll(".arc")._groups[0].length; i++) {
      svg.selectAll(".arc")._groups[0][i].setAttribute("opacity",0);
    }
  }
  if($("#fullDepthCheckbox").prop("checked") === true) {
    for(var i = 0; i < svg.selectAll(".point")._groups[0].length; i++) {
      visitMap.set(svg.selectAll(".point")._groups[0][i].getAttribute("tag"), false);
    }
    for(var i = 0; i < currentPointFilter.length; i++) {
      dfs(currentPointFilter[i]);
    }
  }

  svg.selectAll(".flyer")
    .attr("opacity", function (d) {
      if($("#fullDepthCheckbox").prop("checked") === false || currentPointFilter.length === 0) {
        d.filtered = "true";
      }
      else {
        if(d.filtered === "temp") {
          d.filtered = "true";
        }
        else {
          d.filtered = "false";
          filterArc(d.sourceTag, d.targetTag);
        }
      }

      if(currentPointFilter.length > 0 && $("#fullDepthCheckbox").prop("checked") === false) {
        var filterReturn = 0;
        for(var i = 0; i < currentPointFilter.length; i++) {
          if(d.sourceTag === currentPointFilter[i] || d.targetTag === currentPointFilter[i]) {
            filterReturn = 1;
            break;
          }
        }
        if(filterReturn === 0) {
          d.filtered = "false";
          filterArc(d.sourceTag, d.targetTag);
        }
      }

      if(currentRepoFilter.length > 0) {
        var filterReturn = 0;
        for(var i = 0; i < currentRepoFilter.length; i++) {
          if(d.stage === currentRepoFilter[i].toLowerCase()) {
            filterReturn = 1;
            break;
          }
        }
        if(filterReturn === 0) {
          d.filtered = "false";
          filterArc(d.sourceTag, d.targetTag);
        }
      }

      if(currentDirFilter.length > 0) {
        var filterReturn = 0;
        for(var i = 0; i < currentDirFilter.length; i++) {
          if((d.direction === "<>" && currentDirFilter[i] === "Bidirectional") || (d.direction === ">" && currentDirFilter[i] === "Unidirectional") || (currentDirFilter[i] === "Unknown" && d.direction !== "<>" && d.direction !== ">")) {
            filterReturn = 1;
            break;
          }
        }
        if(filterReturn === 0) {
          d.filtered = "false";
          filterArc(d.sourceTag, d.targetTag);
        }
      }

      if($("#unknownStemCheckbox").prop("checked")) {
        if(!(d.stems === undefined || d.stems === -1)) {
          if(d.stems < parseInt($("#stemFilterCount").attr("value"))) {
            d.filtered = "false";
            filterArc(d.sourceTag, d.targetTag);
          }
        }
      }
      else {
        if(d.stems < parseInt($("#stemFilterCount").attr("value"))) {
          d.filtered = "false";
          filterArc(d.sourceTag, d.targetTag);
        }
      }
      return fade_at_edge(d);
    });
}

function dfs(curr) {
  if(visitMap.get(curr) === true) {
    return;
  }
  visitMap.set(curr,true);
   svg.selectAll(".flyer")
    .attr("opacity", function (d) {
      if(d.sourceTag === curr) {
        d.filtered = "temp";
        dfs(d.targetTag);
      }
      else if(d.targetTag === curr) {
        d.filtered = "temp";
        dfs(d.sourceTag);
      }
      return fade_at_edge(d);
    });
}

$(".eP").click(function(e) {
    e.stopPropagation();
});

$("body,html").click(function(e){
  if ($("#sidenav").css("left") === "0px"){
    closeNav();
  }
});

function openNav() {
  $("#sidenav").css("left", "0px");
}

function closeNav() {
  $("#sidenav").css("left", "-180px");
}

function toggleDropdown(t, id) {
  if($(id).css("display") === "none") {
    $(".dropdown-content").css("display", "none");
    for(var i = 0; i < $(".dropdown-content").length; i++) {
      var filterButton = $(".dropdown-content")[i].previousElementSibling;
      filterButton.innerHTML = filterButton.innerHTML.slice(0,filterButton.innerHTML.indexOf("<")) + '<i class="fa fa-caret-right"></i>';
    }
  }
  $(id).toggle();
  if($(id).css("display") === "none") {
    t.innerHTML = t.innerHTML.slice(0,t.innerHTML.indexOf("<")) + '<i class="fa fa-caret-right"></i>';
  }
  else {
    t.innerHTML = t.innerHTML.slice(0,t.innerHTML.indexOf("<")) + '<i class="fa fa-caret-down"></i>';
  }
  var sidenavHeight = $("#sidenav").css("height");
  var val = parseInt(sidenavHeight.substring(0,sidenavHeight.length-2));
  var offset = 487;
  var total = val - offset >= 0 ? val - offset : 0;
  $("#pointList").css("max-height", (total) + "px");
}

function checkPoints() {
  $("#pointCheckbox").prop("checked", !$("#pointCheckbox").prop("checked"));
  handleUnusedPoints();
}

function fullDepth() {
  $("#fullDepthCheckbox").prop("checked", !$("#fullDepthCheckbox").prop("checked"));
  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
}

function toggleShadows() {
  $("#toggleShadowsCheckbox").prop("checked", !$("#toggleShadowsCheckbox").prop("checked"));
  filterArcsAndFlyers();
  refresh();
}

$("#stemFilterSlider").on("input", function() {
  $("#stemFilterCount").attr("value", this.value);
});

$("#stemFilterSlider").on("change", function() {
  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
});

$("#stemFilterCount").on("change", function() {
  var val = this.value;
  val = Math.max(0,val);
  val = Math.min(100000,val);
  $(this).attr("value", val);
  $("#stemFilterSlider").attr("value", this.value);
  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
});

function unknownStem() {
  $("#unknownStemCheckbox").prop("checked", !$("#unknownStemCheckbox").prop("checked"));
  filterArcsAndFlyers();
  refresh();
  handleUnusedPoints();
}

function filterSearchPoints() {
  var searchValue = $("#pointSearch")[0].value;
  var points = $("#pointList")[0].children;
  var searchEmpty = 0;
  for(var i = 0; i < points.length; i++) {
    if($(points[i]).text().substring(0,searchValue.length).toUpperCase() !== searchValue.toUpperCase()) {
      $(points[i]).css("display","none");
    }
    else {
      $(points[i]).css("display","");
      searchEmpty = 1;
    }
  }
  if(searchEmpty === 0) {
    $("#pointList").css("min-height",0);
  }
  if(searchEmpty === 1 || searchValue === "") {
    $("#pointList").css("min-height",42);
  }
}

function handleUnusedPoints() {
  if($("#pointCheckbox").prop("checked") === false) {
    setPoints(0,0);
  }
  else {
    setPoints(0.6,0.9);
    return;
  }

  svg.selectAll(".flyer")
  .attr("opacity", function (d) {
    if(this.getAttribute("opacity") !== "0") {
      var dsource = String(d.source[0])+","+String(d.source[1]);
      var dtarget = String(d.target[0])+","+String(d.target[1]);
      var points = svg.selectAll(".point")._groups[0];
      for(var j = 0; j < points.length; j++) {
        if(points[j].getAttribute("coordinate") === dsource) {
          points[j].setAttribute("style", "opacity: 0.6");
        }
        if(points[j].getAttribute("coordinate") === dtarget) {
          points[j].setAttribute("style", "opacity: 0.6");
        }
      }
      var labels = svg.selectAll(".label")._groups[0];
      for(var k = 0; k < labels.length; k++) {
        if(labels[k].getAttribute("coordinate") === dsource) {
          labels[k].setAttribute("style", "opacity: 0.9");
        }
        if(labels[k].getAttribute("coordinate") === dtarget) {
          labels[k].setAttribute("style", "opacity: 0.9");
        }
      }
    }
    return fade_at_edge(d);
  })

  for(var i = 0; i < svg.selectAll(".point")._groups[0].length; i++) {
    if(currentPointFilter.indexOf(svg.selectAll(".point")._groups[0][i].getAttribute("tag")) !== -1) {
      svg.selectAll(".point")._groups[0][i].setAttribute("style", "opacity: 0.6");
    }
  }
  for(var i = 0; i < svg.selectAll(".label")._groups[0].length; i++) {
    if(currentPointFilter.indexOf(svg.selectAll(".label")._groups[0][i].innerHTML) !== -1) {
      svg.selectAll(".label")._groups[0][i].setAttribute("style", "opacity: 0.9");
    }
  }
  refresh();
}
