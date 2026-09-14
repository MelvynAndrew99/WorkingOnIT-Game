import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, type Trip} from './cityModel.ts';
import {communityRoadKeys, parseCommunityRoads} from './cityCommunityRoads.ts';
import {roadIndex, trafficTick, TRAFFIC_TICK, parseHistory} from './cityTraffic.ts';
import {routeCost, routingSnapshot, weightedRoute} from './cityRouting.ts';

function corridor() {
  const city = createCity();
  city.roads = Array.from({length:12}, (_,x)=>({x,y:5}));
  return city;
}
test('community limits physically apply to cars, buses and responding crews; old roads retain their speeds',()=>{
  for (const vehicle of [{}, {busId:99}, {service:'police' as const,phase:'outbound' as const}]) {
    for (const community of [false,true]) {
      const city = corridor();
      if (community) city.communityRoads = city.roads.map(p=>({...p}));
      const trip:Trip = {id:1,homeId:0,storeId:0,path:city.roads.map(p=>({...p})),progress:0,hold:0,wait:0,...vehicle};
      city.trips=[trip];
      for (let i=0;i<40;i++) {city.elapsed+=TRAFFIC_TICK;trafficTick(city,roadIndex(city));}
      assert.equal(trip.progress, community ? 1 : ('service' in vehicle ? 3 : 2));
      assert.equal(trip.wait,0);
    }
  }
});
test('weighted routes use the same community limit and prefer a faster public-road detour',()=>{
  const city=corridor(), start=city.roads[0], goal=city.roads.at(-1)!;
  const direct=city.roads.map(p=>({...p}));
  city.roads.push(...direct.map(p=>({x:p.x,y:7})),{x:0,y:6},{x:11,y:6});
  city.communityRoads=direct.slice(1,-1);
  const s=routingSnapshot(city);
  assert.equal(routeCost(s,direct).travel,11);
  assert.equal(routeCost(s,direct,3).travel,11);
  const route=weightedRoute(s,start,goal)!;
  assert.ok(route.path.some(p=>p.y===7));
  assert.ok(route.cost.travel<11);
  const revision=s.revision;
  city.communityRoads=[];
  assert.notEqual(routingSnapshot(city).revision,revision);
  assert.equal(routeCost(s,direct).travel,11,'published snapshot retains original speed metadata');
  assert.equal(routeCost(routingSnapshot(city),direct).travel,5.5);
});
test('community metadata validates real narrow pavement without duplicates or invented roads',()=>{
  const roads=[{x:1,y:1},{x:1,y:2}];
  assert.deepEqual(parseCommunityRoads(undefined,roads),[]);
  const parsed=parseCommunityRoads([roads[0]],roads)!;
  assert.deepEqual([...communityRoadKeys({communityRoads:parsed})],['1,1']);
  assert.notEqual(parsed[0],roads[0]);
  for(const raw of [[roads[0],roads[0]],[{x:9,y:9}],[{x:1.2,y:1}],null]) assert.equal(parseCommunityRoads(raw,roads),null);
  assert.equal(parseCommunityRoads([roads[1]],roads,[{x:1,y:1,axis:'horizontal'}]),null);
});
test('a completed work return keeps its own history purpose across history parsing',()=>{
  const city=corridor();city.elapsed=10;
  city.trips=[{id:1,homeId:2,storeId:3,path:[city.roads[0]],progress:0,hold:0,wait:1,phase:'returning',purpose:'work',rewarded:true,visitedAt:8,startedAt:2}];
  trafficTick(city,roadIndex(city));
  assert.equal(city.completed,1);
  assert.deepEqual(parseHistory(city.history,10),[{at:10,wait:1,service:{homeId:2,purpose:'work',visitedAt:8,startedAt:2}}]);
});
