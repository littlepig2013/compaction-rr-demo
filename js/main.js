

var generateColor = function(colorStart,colorEnd,colorCount){
	start_r = parseInt(colorStart.substring(1, 3), 16);
  start_g = parseInt(colorStart.substring(3, 5), 16);
  start_b = parseInt(colorStart.substring(5, 7), 16);
  end_r = parseInt(colorEnd.substring(1, 3), 16);
  end_g = parseInt(colorEnd.substring(3, 5), 16);
  end_b = parseInt(colorEnd.substring(5, 7), 16);

	// The number of colors to compute
	var len = colorCount;
	//Alpha blending amount
	var alpha = 0.0;
	var result = [];
	for (i = 0; i < len; i++) {
		alpha += (1.0/len);
		r = Math.round(start_r * alpha + (1 - alpha) * end_r);
    r_str = r.toString(16)
    if (r_str.length <= 1) r_str = "0" + r_str
		g = Math.round(start_g * alpha + (1 - alpha) * end_g);
    g_str = g.toString(16)
    if (g_str.length <= 1) g_str = "0" + g_str
		b = Math.round(start_b * alpha + (1 - alpha) * end_b);
    b_str = b.toString(16)
    if (b_str.length <= 1) b_str = "0" + b_str
		result.push("#" + r_str+g_str+b_str);
	}

	return result;

}

class SstFile {
  constructor(start=0.0, stop=4.0, num_of_elements=1.0) {
    this.start = start;
    this.stop = stop;
    this.num_of_elements = num_of_elements;
  }

  getDensity() {
    return this.num_of_elements/(this.stop-this.start);
  }
};
localId = 0;
iterations = 0;
phase = -1;
upper_rr_files = [new SstFile(0.0, 4, 4.0)];
rr_files = [new SstFile(0.0, 1, 4.0), new SstFile(1.0, 2.0, 4.0), new SstFile(2.0, 3.0, 4.0), new SstFile(3.0, 4.0, 4.0)];
mo_files = [new SstFile(0.0, 1, 4.0), new SstFile(1.0, 2.0, 4.0), new SstFile(2.0, 3.0, 4.0), new SstFile(3.0, 4.0, 4.0)];
rr_new_files = [];
rr_cursor = 0;
rr_picking_file_idx = 0;
rr_last_pick_ele = 0;
mo_last_pick_ele = 0;
mo_picking_file_idx = 0;
max_density = 10;
filesize = 4;
rr_acc_cmpct_elements_in_next_lvl = 0;
mo_acc_cmpct_elements_in_next_lvl = 0;
var getColor = function(density) {
  rate = density*1.0/max_density;
  r = (Math.round(parseInt("00",16)*rate + (1 - rate)*parseInt("DF",16))).toString(16);
  g = r;
  return "#" + r + g + "FF";
}

var drawSstFiles = function(input_files, policy) {
  var parent_elem = document.getElementById(policy);
  var total_width = ((Math.ceil(parent_elem.clientWidth - 24 - 3*input_files.length) * 0.95) - 1)/4;
  if (input_files.length == 1) {
    total_width = Math.ceil(parent_elem.clientWidth - 30)*0.95/4;
  }
  var div_wrap = document.createElement("div");
  div_wrap.setAttribute("class", 'lsm-btn-group');
  //div_wrap.style.margin
  for(var i = 0; i < input_files.length; i++){
    var btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "lsm-btn btn btn-secondary");
    var width = total_width*(input_files[i].stop - input_files[i].start)
    var border_style = "thick solid #D3D3D3";
    //var color = getColor(input_files[i].getDensity());
    var color = getColor(input_files[i].num_of_elements);
    if (input_files[i].num_of_elements == 0){
      border_style = "thick dotted #000000";
      color = "#FFFFFF";
    } else {
      if (input_files[i].stop - input_files[i].start < 0.2) {
        btn.innerHTML = "<p style='font-style:bold;color:black;margin-left:-12px;font-size:12px;margin-top:5px'>" + parseFloat(input_files[i].num_of_elements.toFixed(2)) + "x" + "</p>";
      } else {
        //btn.innerHTML = "<p class='text-center'>" + parseFloat(input_files[i].getDensity().toFixed(2)) + "x" + "</p>";
        btn.innerHTML = "<p class='text-center' style='font-style:bold;'>" + parseFloat(input_files[i].num_of_elements.toFixed(2)) + "x" + "</p>";
      }

    }
    btn.setAttribute("style", "background-color:" + color + ";border:" + border_style+ ";width: " + width + "px;");

    div_wrap.appendChild(btn);
  }
  div_wrap.appendChild(createDarkBulb());

  parent_elem.appendChild(div_wrap);
}

var createGlowBulb = function() {
  var lightbulb_icon = document.createElement("img");
  lightbulb_icon.src = "img/bulb_glow.png";
  lightbulb_icon.style.width = "24px";
  lightbulb_icon.style.height = "24px";
  lightbulb_icon.style.margin = "11px 5px"
  //lightbulb_icon.classList.add("blinker");
  return lightbulb_icon;
}

var createDarkBulb = function() {
  var lightbulb_icon = document.createElement("span");
  lightbulb_icon.classList.add("material-icons-outlined");
  lightbulb_icon.classList.add("md-18");
  lightbulb_icon.innerHTML = "lightbulb";
  lightbulb_icon.style.margin = "11px 5px"
  return lightbulb_icon;
}

var currLvlFull = function(policy) {
  var curr_lvl_elem = document.getElementById(policy).lastChild;
  curr_lvl_elem.removeChild(curr_lvl_elem.lastChild);
  curr_lvl_elem.appendChild(createGlowBulb());
}

var pickFileToCompact = function(policy) {
  var parent_elem = document.getElementById(policy);
  var file_idx_picked = 0;
  var selected_density = 0;
  if (policy == "rr-emul") {
    for(var i = 0; i < rr_files.length; i++) {
      if (rr_files[i].start >= rr_cursor) {
        file_idx_picked = i;
        rr_acc_cmpct_elements_in_next_lvl += rr_files[i].stop - rr_files[i].start;
        rr_last_pick_ele = rr_files[i].num_of_elements; 
        selected_density = rr_files[i].getDensity();
        break;
      }
    }
    if ( file_idx_picked == rr_files.length - 1) {
      rr_cursor = 0.0;
    } else {
      rr_cursor = rr_files[file_idx_picked + 1].start;
    }
    document.getElementById(policy+'-wa').innerHTML = "#bytes from compaction (read from the next lvl, others are the same): &nbsp;&nbsp;" + rr_acc_cmpct_elements_in_next_lvl.toFixed(2) + "x";
  } else {
    var min_density = 0;
    for(var i = 0; i < mo_files.length; i++) {
      if (mo_files[i].getDensity() > min_density) {
        file_idx_picked = i;
        min_density = mo_files[i].getDensity();
      }
    }
    selected_density = min_density;
    mo_last_pick_ele = mo_files[file_idx_picked].num_of_elements; 
    mo_acc_cmpct_elements_in_next_lvl += mo_files[file_idx_picked].stop - mo_files[file_idx_picked].start;
    document.getElementById(policy+'-wa').innerHTML = "#bytes from compaction (read from the next lvl, others are the same): &nbsp;&nbsp;" + mo_acc_cmpct_elements_in_next_lvl.toFixed(2) + "x";
  }
  selected_file_btn = parent_elem.lastChild.children[file_idx_picked];
  selected_file_btn.style['border-color'] = 'red';
  return file_idx_picked;
}

var emptyFile = function(idx, policy) {
  var curr_lvl_elem = document.getElementById(policy).lastChild;
  curr_lvl_elem.children[idx].innerHTML = '';
  curr_lvl_elem.children[idx].style['background'] = '#FFFFFF';
  curr_lvl_elem.children[idx].style['border'] = "thick dotted #000000";
  curr_lvl_elem.removeChild(curr_lvl_elem.lastChild);
  curr_lvl_elem.appendChild(createDarkBulb());
}

var fillUpperLvl = function(policy) {
  var upper_lvl_elem = document.getElementById(policy).children[0];
  upper_lvl_elem.children[0].style['border'] = "thick solid #D3D3D3";
  upper_lvl_elem.children[0].style['background-color'] = getColor(4.00);
  upper_lvl_elem.children[0].innerHTML = "4.00x";
  upper_lvl_elem.removeChild(upper_lvl_elem.lastChild);
  upper_lvl_elem.appendChild(createGlowBulb());
}

var cmpctToCurrLvl = function(policy) {
  document.getElementById(policy).innerHTML = '';
  var new_files = [];
  var next_start_key = 0.0;
  var acc_size = 0.0;
  var curr_total_elements = 0.0;
  var temp_files;
  var cursor;
  if (policy == "rr-emul") {
    if (rr_cursor == 0.0) {
      split_by_cursor = true;
    } else {
      split_by_cursor = false;
    }

    temp_files = rr_files;
    cursor = rr_cursor;
  } else {
    split_by_cursor = true;
    temp_files = mo_files;
    cursor = 0.0;
  }

  for (var j = 0; j < temp_files.length; j++) {
    curr_total_elements += temp_files[j].num_of_elements;
  }
  var i = 0;
  var padding_end = temp_files[0].start;
  var front_padding_num_elements = padding_end - next_start_key;

  while (i < temp_files.length) {
    if (temp_files[i].start - padding_end + front_padding_num_elements > filesize) {
      if (!split_by_cursor && next_start_key <= cursor && temp_files[i].start > cursor) {
        split_by_cursor = true;
        new_files.push(new SstFile(next_start_key, cursor, front_padding_num_elements + cursor - next_start_key));
        padding_end = temp_files[i].start;
        front_padding_num_elements = padding_end - cursor;
      } else {
        new_files.push(new SstFile(next_start_key, (filesize - front_padding_num_elements) + padding_end, filesize));
        next_start_key = (filesize - front_padding_num_elements) + padding_end;
        front_padding_num_elements = temp_files[i].start - padding_end + front_padding_num_elements - filesize;
        padding_end = temp_files[i].start;
      }
      continue;
    } else if (temp_files[i].num_of_elements + temp_files[i].stop - padding_end + front_padding_num_elements < filesize) {
      if (!split_by_cursor && padding_end <= cursor && temp_files[i].stop > cursor) {
        expanded_filesize = temp_files[i].num_of_elements + temp_files[i].stop - temp_files[i].start;
        ratio = (cursor - temp_files[i].start)*1.0/(temp_files[i].stop - temp_files[i].start);
        new_files.push(new SstFile(next_start_key, cursor, (temp_files[i].start - padding_end + front_padding_num_elements) + ratio*expanded_filesize));
        front_padding_num_elements = (temp_files[i].stop - cursor)*1.0/(temp_files[i].stop - temp_files[i].start)*expanded_filesize;
        next_start_key = cursor;
        padding_end = cursor;
        split_by_cursor = true;
      } else {
        front_padding_num_elements += temp_files[i].num_of_elements + temp_files[i].stop - padding_end
        padding_end = temp_files[i].stop;
      }
      i++;
      continue;
    }

    expanded_filesize = temp_files[i].num_of_elements + temp_files[i].stop - temp_files[i].start;
    next_stop_key = Math.min(4, (filesize - front_padding_num_elements - (temp_files[i].start - padding_end))*1.0/expanded_filesize*(temp_files[i].stop - temp_files[i].start) + temp_files[i].start);

    if (!split_by_cursor && next_stop_key > cursor) {
      split_by_cursor = true;
      num_of_elements = front_padding_num_elements + (temp_files[i].start - padding_end) + (rr_cursor - temp_files[i].start)*1.0/(temp_files[i].stop - temp_files[i].start)*expanded_filesize;
      new_files.push(new SstFile(next_start_key, cursor, num_of_elements));
      padding_end = cursor;
      if (rr_cursor >= next_start_key) {
        front_padding_num_elements = 0;
        padding_end = cursor;
      } else {
        i++;
      }
      next_start_key = cursor;
    } else if (next_stop_key == 4) {
      new_files.push(new SstFile(next_start_key, 4, front_padding_num_elements + (temp_files[i].start - padding_end) + (4 - temp_files[i].start)*1.0/(temp_files[i].stop - temp_files[i].start)*expanded_filesize));
      front_padding_num_elements = 0;
      break;
    } else {
      new_files.push(new SstFile(next_start_key, next_stop_key, filesize));
      front_padding_num_elements = (temp_files[i].stop - next_stop_key)*1.0/(temp_files[i].stop - temp_files[i].start)*expanded_filesize
      padding_end = temp_files[i].stop;
      next_start_key = next_stop_key;
      i++;
    }
  }

  if (front_padding_num_elements > 0) {
    var new_tt_elements = 0;
    for (var i = 0; i < new_files.length; i++) {
        new_tt_elements += new_files[i].num_of_elements;
    }
    //new_files.push(new SstFile(next_start_key, 4, parseFloat((front_padding_num_elements + 4 - padding_end).toFixed(2))));
    new_files.push(new SstFile(next_start_key, 4, parseFloat((curr_total_elements + 4 - new_tt_elements).toFixed(2))));
  }
  
  drawSstFiles(upper_rr_files, policy);
  drawSstFiles(new_files, policy);

  if(policy == "rr-emul") {
    rr_files.length = 0;
    for(var i = 0; i < new_files.length; i++){
      rr_files.push(new SstFile(new_files[i].start, new_files[i].stop, new_files[i].num_of_elements));
    }
    new_files.length = 0;
  } else {
    mo_files.length = 0;
    for(var i = 0; i < new_files.length; i++){
      mo_files.push(new SstFile(new_files[i].start, new_files[i].stop, new_files[i].num_of_elements));
    }
    new_files.length = 0;
  }
}

var init = function() {
  upper_rr_files = [new SstFile(0.0, 4, 0.0)];
  rr_files = [new SstFile(0.0, 1, 4.0), new SstFile(1.0, 2.0, 4.0), new SstFile(2.0, 3.0, 4.0), new SstFile(3.0, 4.0, 4.0)];
  mo_files = [new SstFile(0.0, 1, 4.0), new SstFile(1.0, 2.0, 4.0), new SstFile(2.0, 3.0, 4.0), new SstFile(3.0, 4.0, 4.0)];
  document.getElementById("rr-emul").innerHTML = "";
  //document.getElementById("rr-emul-text").innerHTML = "Density of every selected file:";
  document.getElementById("rr-emul-wa").innerHTML = "#bytes from compaction (read from the next lvl, others are the same):";
  drawSstFiles(upper_rr_files, "rr-emul");
  drawSstFiles(rr_files, "rr-emul");
  document.getElementById("mo-emul").innerHTML = "";
  //document.getElementById("mo-emul-text").innerHTML = "Density of every selected file:";
  document.getElementById("mo-emul-wa").innerHTML = "#bytes from compaction (read from the next lvl, others are the same):";
  drawSstFiles(upper_rr_files, "mo-emul");
  drawSstFiles(mo_files, "mo-emul");
  var tmp = generateColor('#0000FF','#DFDFFF',10);
  phase = -1;
  iterations = 0;
  /*
  for (cor in tmp) {
    //$('#gradient-show').append("<div style='padding:8px;color:#FFF;background-color:#"+tmp[cor]+"'>Density : "+cor/10+" - #"+tmp[cor]+"</div>")
    $('#gradient-show').append("<div style='padding:20px;color:#FFF;background-color:"+tmp[cor]+"'>Density : "+(cor*1+1)+"</div>")
  }*/
}

function startPlaying() {
	if (iterations >= 6) return;
  if (phase == -1) {
    currLvlFull("rr-emul");
    currLvlFull("mo-emul");
    phase++;
  } else if (phase == 0) {
    rr_picking_file_idx = pickFileToCompact("rr-emul");
    mo_picking_file_idx = pickFileToCompact("mo-emul");
    rr_files.splice(rr_picking_file_idx, 1);
    mo_files.splice(mo_picking_file_idx, 1);
    phase++;
  } else if (phase == 1) {
    emptyFile(rr_picking_file_idx, "rr-emul");
    emptyFile(mo_picking_file_idx, "mo-emul");
    phase++;
  } else if(phase == 2) {
    fillUpperLvl("rr-emul");
    fillUpperLvl("mo-emul");
    phase++;
  } else if(phase == 3) {
    cmpctToCurrLvl("rr-emul");
    cmpctToCurrLvl("mo-emul");
    phase = -1;
    iterations++;
  }
  setTimeout(startPlaying, 1000)
}


document.querySelector("#autoplay-button").onclick = startPlaying;
document.querySelector("#reset-button").onclick = init;

window.addEventListener('load', (event) => {
  init();
});
