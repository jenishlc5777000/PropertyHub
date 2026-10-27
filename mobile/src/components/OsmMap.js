import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { formatPriceShort } from '@propertyhub/shared';

/**
 * OpenStreetMap via Leaflet inside a WebView — no Google Maps SDK or API key needed.
 * mode="markers": price pins, onSelect(id) when tapped.
 * mode="picker": tap/drag to choose a point, onPick(lat, lng).
 */
const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%;font-family:-apple-system,Roboto,sans-serif}
.pin{transform:translate(-50%,-100%);display:inline-block;white-space:nowrap;background:#0f2a4a;color:#fff;font-weight:700;font-size:12px;padding:4px 8px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.pin.me{background:#059669}</style></head><body><div id="m"></div><script>
var map=L.map('m',{zoomControl:true}).setView([20.59,78.96],5);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map), picker=null, circle=null;
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
function icon(t,me){return L.divIcon({className:'',html:'<div class="pin'+(me?' me':'')+'">'+t+'</div>',iconSize:[0,0]});}
window.setData=function(d){
  layer.clearLayers(); if(circle){map.removeLayer(circle);circle=null;}
  var pts=[];
  (d.markers||[]).forEach(function(m){pts.push([m.lat,m.lng]);
    L.marker([m.lat,m.lng],{icon:icon(m.label)}).on('click',function(){post({type:'select',id:m.id});}).addTo(layer);});
  if(d.center){pts.push(d.center); if(d.radiusKm){circle=L.circle(d.center,{radius:d.radiusKm*1000,color:'#059669',fillOpacity:.05}).addTo(map);}}
  if(d.mode==='picker'){
    if(d.pick){ if(!picker){picker=L.marker(d.pick,{draggable:true,icon:icon('📍',true)}).addTo(map);
      picker.on('dragend',function(e){var p=e.target.getLatLng();post({type:'pick',lat:p.lat,lng:p.lng});});} else picker.setLatLng(d.pick);
      map.setView(d.pick,Math.max(map.getZoom(),15)); }
    return;
  }
  if(pts.length===1) map.setView(pts[0],14); else if(pts.length) map.fitBounds(pts,{padding:[30,30],maxZoom:14});
};
map.on('click',function(e){post({type:'pick',lat:e.latlng.lat,lng:e.latlng.lng});});
post({type:'ready'});
</script></body></html>`;

export default function OsmMap({ properties = [], center, radiusKm, mode = 'markers', pick, onSelect, onPick, style }) {
  const ref = useRef(null);
  const ready = useRef(false);
  const data = useMemo(
    () => ({
      mode,
      center,
      radiusKm,
      pick,
      markers: properties
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ id: p._id, lat: p.lat, lng: p.lng, label: formatPriceShort(p.price) })),
    }),
    [properties, center, radiusKm, mode, pick]
  );
  const push = () => ref.current?.injectJavaScript(`window.setData(${JSON.stringify(data)});true;`);
  useEffect(() => {
    if (ready.current) push();
  });

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://propertyhub.local/' }}
        onMessage={(e) => {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'ready') {
            ready.current = true;
            push();
          } else if (msg.type === 'select') onSelect?.(msg.id);
          else if (msg.type === 'pick' && mode === 'picker') onPick?.(msg.lat, msg.lng);
        }}
        javaScriptEnabled
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
