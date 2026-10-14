const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,prices}=require('./updater.cjs');
test('non-card products are excluded',()=>assert.equal(normalize({productId:1,name:'Box',extendedData:[]},{groupId:2,name:'Set'}),null));
test('versions retain product and set identity',()=>assert.deepEqual(normalize({productId:1,name:'Card',extendedData:[{name:'Number',value:'001'}]},{groupId:2,name:'Set'}),{id:1,n:'Card',s:'Set',g:2,no:'001',r:'',pre:false}));
test('only matched finite positive prices retained',()=>assert.deepEqual(prices([{productId:1,marketPrice:3,subTypeName:'Normal'},{productId:2,marketPrice:9},{productId:1,marketPrice:0},{productId:1,marketPrice:Infinity},{productId:1,marketPrice:'3'}],new Set([1])),{'1':[{type:'Normal',usd:3}]}));
test('invalid mode fails before fetching',async()=>assert.rejects(()=>require('./updater.cjs').run('invalid'),/Expected/));

