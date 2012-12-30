// Les contrôles
var sltTheme;
var sltType;
var sltDistance;
var slrNombre;
var txtKeyword;
var lstPoi;

// Variables
var lat = 47.217316595885734;
var lng = -1.5465397033691520;

// Carte & Code
var mapInfo;
var markerPOI;
var markerPOIOrgine;
var mapDepart;
var markerOrigine;
var polyline;

// Suivi du chargement
var themeOK = 0;
var themes;
var typeOK = 0;
var types;
var aboutOK = 0;


// Lors du chargement d'une page
$('[data-role=page]').live('pageshow', function (event, ui) {
        // injection d'une page de footer commune (le menu)
        $("#" + event.target.id).find("[data-role=footer]").load("footer.html", function(){
        	$("#" + event.target.id).find("[data-role=navbar]").navbar();
        });

});

// Si la page chargée est la vue détail
$('#details').live('pageshow', function (event, ui) {
		if(typeof mapInfo != 'undefined') { mapInfo.invalidateSize(false); }
});

// Si la page chargée est la vue détail
$('#depart').live('pageshow', function (event, ui) {
		majMapDepart();
});

// Si la page chargée est la vue détail
$('#apropos').live('pageshow', function (event, ui) {
		if(aboutOK == 0) {
			$.getJSON('./json/about.json', function(data) { remplirAbout(data); });
        }
});

// C'est bon ? 
$(document).ready(function() { 
     loading(true);
     try {
		 console.log('Début du chargement');
		 // Recupération des contrôles graphiques
		 sltTheme    = $("#sltTheme");
		 sltType     = $("#sltType");
		 sltDistance = $("#sltDistance");
		 slrNombre   = $("#slrNombre");
		 txtKeyword  = $("#txtkeyword");
		 lstPoi      = $('#poislist');
		 
		 // Chargement des thèmes
		 $.getJSON('./json/themes.json', function(data) { 
				themes = data; 
		        themeOK = 1; 
		        remplirThemes(); 
		        $.getJSON('./json/types.json', function(data) { types = data; typeOK = 1; changeTheme(); });
		 });

		 // Chargement des cartes
		 // La carte détail : poi-map
		 mapInfo = L.map("poi-map").setView([lat, lng], 10);
		 L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
		 }).addTo(mapInfo);
		 // La carte depart : depart-map
		 mapDepart = L.map("depart-map").setView([lat, lng], 10);
		 L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
		 }).addTo(mapDepart);

		 // Demande de geolocalisation
		if (navigator.geolocation) {
	  		navigator.geolocation.getCurrentPosition(handleGeolocalisation);
		}	
		 
		 // Capture des events
		 $("#btngo").click(function() { search(); });
		 $("#btngomap").click(function() { search(); });
         $('#btnitineraires').click(function() { calculerItineraires(); });
		 sltTheme.change(function() { changeTheme(); });
		 mapDepart.addEventListener('click', function(e) { lat = e.latlng.lat; lng = e.latlng.lng; majMapDepart(); });

         // Navigation
 	     $.mobile.changePage($("#search"));
     } finally {
		loading(false);
     }
});

// Réception des infos de geolocalisation
function handleGeolocalisation(position) {
   lat = position.coords.latitude;
   lng =  position.coords.longitude;
   majMapDepart();
}

// Mise à jour de la carte MapDepart au besoin
function majMapDepart() {
	if(typeof mapDepart != 'undefined') { 
		var l = new L.LatLng(lat, lng);
	    mapDepart.setView(l, 10, false);
	    mapDepart.invalidateSize(false); 
		if(typeof markerOrigine == 'undefined') { 
				  
				  var i = L.icon( { iconUrl: './resources/images/position.png', iconSize:[32,37], iconAnchor:[16,35] } );
				  markerOrigine = new L.marker(l, { icon: i, draggable: true });
				  markerOrigine.addTo(mapDepart);
                  markerOrigine.addEventListener('dragend', function(e) {
                        var m = e.target.getLatLng();
                        lat = m.lat;
					    lng =  m.lng;
                    });
		} else {
	        markerOrigine.setLatLng(l);
	    }
	}
} // Fin de la mise à jour de la carte depart

// Gestion d'un remplissage de thèmes
function remplirThemes() {
   var html = "";
   // Remplissage :)
   $.each(themes, function(index, obj) { html += "<option value='" + obj.code + "' > " + obj.nom + "</option>"; });
   // Selection du premier
   sltTheme.html(html).selectmenu('refresh', true);
}

// Gestion d'un changement de theme
function changeTheme() {
    if( (themeOK == 1) && (typeOK == 1)) {
        var html = "";
		var theme    = sltTheme.val();
		 $.each(types, function(index, obj) { 
		     if(theme == obj.theme) { html += "<option value='" + obj.code + "' > " + obj.nom + " </option>"; }
		});
     	sltType.html(html).selectmenu('refresh', true);
	}
} // /changeTheme

// Lancement de la recherche
function search() {
     loading(true); 
     // Récupération des valeurs dans le formulaire
     var theme    = sltTheme.val();
     var type     = sltType.val();
     var distance = sltDistance.val();
     var nombre   = slrNombre.val();
     var keyword  = txtKeyword.val();
     if(keyword.length <= 0) { keyword = "*"; }
     
     // Construction de la requête
     var url = "http://hack2012.logisima.com/hack2012/_search";
     var data = '{ "from" : 0, "size" : ' + nombre +', "query" :  { "query_string" : {"query" : "' + keyword + '" } }, "filter" : {  "and" : [ {  "geo_distance" : { "distance" : "' + distance + '", "pin" : { "lat":' + lat +', "lon":' + lng +' } } }, { "term" : {  "theme": "' + theme + '" } }, { "term" : {  "type": "' + type + '" } } ]  }, "sort" : [ { "_geo_distance" : { "pin" : { "lat": ' + lat + ', "lon" : ' + lng + '  }, "order" : "asc", "unit" : "km" } } ] }';

     // Chargement Ajax en mode Post
     $.ajax({
        type: 'POST', url:url, data: data, dataType:'json',
        success: function(response) { manageSearch(response.hits.hits); }
     });
} // Fin de la recherche

// Gestion d'un résultat de recherche
function manageSearch(pois) {
   try {
	   // Contenu HTML
	   var content = "";
	   // Pour chaque élement retourné
	   $.each(pois, function(index, obj) { 
		      if(typeof lstPoi.data(obj._source.name) == 'undefined') {
		          // Quelques calculs
				  obj.distance = distance(lat, lng, obj._source.pin.lat, obj._source.pin.lon).toFixed(1);
                  // Il y a quelques
				  var site = obj._source.site;
				  if(site.substring(0,4) != 'http') { site = 'http://' + site; }
				  obj._source.site = site; 
		          // Rendu
				  content += $("#poitemplate").render(obj);
				  // Stockage de l'objet
				  lstPoi.data(obj._source.name, obj);
		  	} 
	   });
	   //
	   lstPoi.html(content);
	   // TODO : trouver un moyen de savoir si la liste a été init ou pas
	   try { lstPoi.listview("refresh"); } catch(err) { }
	   $("a.linklist").click(function() { viewDetail($(this)); });
   } finally {
	   // Navigation
	   $.mobile.changePage($("#result"));
       loading(false);
   }

} // Fin de la gestion d'un résultat de recherche

// Affichage du détail du POI
function viewDetail(link) {
    //console.log(link.data('nom'));
    
    var obj = lstPoi.data(link.data('nom'));
    if(typeof obj != 'undefined') {
        try {
           loading(true);
		   // La partie info
		   var html = $("#poiinfo").render(obj._source);
		   $('#poi-info').html(html);

           // Raz de l'itineraire
           $("#poi-iti").html("");
		  
		   // La partie carte
		   if(typeof polyline != 'undefined') { mapInfo.removeLayer(polyline); }
	 	   // --> Marker de l'origine
		   var l = new L.LatLng(lat, lng);
		   if(typeof markerPOIOrgine == 'undefined') { 
		      var i = L.icon( { iconUrl: './resources/images/position.png', iconSize:[32,37], iconAnchor:[16,35] } );
		      markerPOIOrgine = new L.marker(l, { icon: i, draggable: false });
		      markerPOIOrgine.addTo(mapInfo);
		   } else {
			  markerPOIOrgine.setLatLng(l);
		   }
		   // --> Marker du POI
		   var latlng = new L.LatLng(obj._source.pin.lat, obj._source.pin.lon);
		   var icon = L.icon( { iconUrl: './resources/images/' + obj._source.type + '/default.png', iconSize:[32,37], iconAnchor:[16,35] } );
		   var marker = new L.marker(latlng, { icon: icon, draggable: false });
		   marker.addTo(mapInfo);
		   if(typeof markerPOI != 'undefined') { mapInfo.removeLayer(markerPOI);}
		   markerPOI = marker;
		   mapInfo.setView(latlng, 10, false);
		   //mapInfo.fitBounds(new L.LatLngBounds([ l, latlng ]));
		} finally {
		    // Navigation
		    $.mobile.changePage($("#details"));
            loading(false);
       	}
    } // Fin du if
    
} // Fin de viewDetail

// Gestion du about
function remplirAbout(data) {
    $('#aboutlist').html($("#aboutitem").render(data));
    try { $('#aboutlist').listview("refresh"); } catch(err) { }
    
} // fin de remplir about

// Calcul de l'itineraires
function calculerItineraires() {
    if(typeof markerPOI != 'undefined') {
        loading(true); 
		// Récupération des coordonnées
		var dlat = markerPOI.getLatLng().lat;
		var dlng = markerPOI.getLatLng().lng;

		var url = 'http://open.mapquestapi.com/directions/v1/route?outFormat=json&routeType=shortest&timeType=1&narrativeType=html&enhancedNarrative=false&shapeFormat=cmp&generalize=200&locale=fr_FR&unit=k&from=' + lat + ',' + lng  + '&to=' + dlat +',' + dlng + '&drivingStyle=2&highwayEfficiency=21.0';

		$.ajax({
           type: 'GET',
           url: url,
           crossDomain: true,
           dataType: 'jsonp',
           jsonpCallback: 'jsonCallback',
           contentType: "application/json"
        }).done(function(msg) { 
					var l = msg.route.legs[0];
                     if(typeof l != 'undefined') { tracerItineraires(l); }
		});

    } // Fin du if

} // Fin du calcul de l'itineraires

// Debut de tracerItineraires
function tracerItineraires(iti) {
        // Variables
		var html = "";
        var points = [];
        // Pour chaque
        $.each(iti.maneuvers, function(index, obj) { 
            html += $("#directionitem").render(obj);
            points.push(new L.LatLng(obj.startPoint.lat, obj.startPoint.lng));
        });
        // Affectation
        $("#poi-iti").html(html);
        // Le tracé
        if(typeof polyline != 'undefined') { mapInfo.removeLayer(polyline); }
        polyline = new L.polyline(points, {color:'#04123F',  opacity:1.0}).addTo(mapInfo);
        mapInfo.fitBounds(polyline.getBounds());

        loading(false); 
} // fin de tracerItineraires

function distance(lat_a, lon_a, lat_b, lon_b)  { 
         //console.log('distance
         a = Math.PI / 180; 
         lat1 = lat_a * a; 
         lat2 = lat_b * a; 
       
         lon1 = lon_a * a; 
         lon2 = lon_b * a;  

         t1 = Math.sin(lat1) * Math.sin(lat2); 
         t2 = Math.cos(lat1) * Math.cos(lat2); 
         t3 = Math.cos(lon1 - lon2); 

         t4 = t2 * t3; 
         t5 = t1 + t4; 

         rad_dist = Math.atan(-t5/Math.sqrt(-t5 * t5 +1)) + 2 * Math.atan(1);  

         return (rad_dist * 3437.74677 * 1.1508) * 1.6093470878864446; 

}

// Chargement
function loading(loading) {
   if(loading) { $.mobile.showPageLoadingMsg("a", "Chargement"); }
   else { $.mobile.hidePageLoadingMsg(); }
}

