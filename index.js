var mongoose = require('mongoose');
const { AsyncLocalStorage } = require('async_hooks');
var mtMongooseStorage = new AsyncLocalStorage();
var multiDb = {};
var defaultDb = null;
var systemDb = null;
var MultiDBMongo = function () {};
//Default tenant db which is used to perform useDB operation.
MultiDBMongo.prototype.setDefaultTenantDB = function (_defaultDB) {
  defaultDb = _defaultDB;
};

//Utility Method to set system(non tenant specific DB) Use this method, so that the model usage across tenant specific and non tenant specific will look same.
MultiDBMongo.prototype.setGlobalDB = function (_systemDb) {
  systemDb = _systemDb;
};
//Method used to set
MultiDBMongo.prototype.setTenantId = function (req, res, next) {
  mtMongooseStorage.run(req['_tid'], next);
};

MultiDBMongo.prototype.getTenantId = function () {
  return mtMongooseStorage.getStore();
};

MultiDBMongo.prototype.getMTModel = function (schemaObj) {
  var tenantDBId = this.getTenantId();
  var tenantDB = defaultDb.useDb(tenantDBId ? tenantDBId : 'test');
  if (tenantDB) {
    return tenantDB.model(
      schemaObj.modelName ? schemaObj.modelName : schemaObj.name,
      schemaObj.schema,
      schemaObj.collectionName ? schemaObj.collectionName : schemaObj.name
    );
  }
};
MultiDBMongo.prototype.getSystemModel = function (schemaObj) {
  return systemDb.model(
    schemaObj.modelName ? schemaObj.modelName : schemaObj.name,
    schemaObj.schema,
  );
};

MultiDBMongo.prototype.getModel = function (schemaObj) {
  if (schemaObj.isGlobal) {
    return this.getSystemModel(schemaObj);
  } else {
    return this.getMTModel(schemaObj);
  }
};

//#region MT Mongoose with Tenant URI

//Default tenant db which is used to perform useDB operation.
MultiDBMongo.prototype.setMultiTenantviaURI = function (tenantId, tenantUri) {
  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  };

  if (multiDb[tenantId] == null) {
    var defaultTenantDb = mongoose.createConnection(tenantUri, mongoOptions);
    multiDb[tenantId] = defaultTenantDb;
  }
};

//Default tenant db which is used to perform useDB operation.
MultiDBMongo.prototype.setMultiTenantviaDB = function (tenantId, tenantDb) {
  multiDb[tenantId] = tenantDb;
};

MultiDBMongo.prototype.setMultiTenantId = function (req, res, next) {
  mtMongooseStorage.run(req['_tid'], next);
};

MultiDBMongo.prototype.getMultiTenantId = function () {
  return mtMongooseStorage.getStore();
};

MultiDBMongo.prototype.getTenantMTModel = function (schemaObj) {
  var tenantDBId = this.getTenantId();
  var tenantDB = multiDb[tenantDBId];
  if (tenantDB) {
    if (!tenantDB.models.hasOwnProperty(schemaObj.modelName)) {
      return tenantDB.model(
        schemaObj.modelName ? schemaObj.modelName : schemaObj.name,
        schemaObj.schema,
      );
    } else {
      return tenantDB.models[schemaObj.modelName];
    }
  }
};
MultiDBMongo.prototype.getTenantSystemModel = function (schemaObj) {
  return systemDb.model(
    schemaObj.modelName ? schemaObj.modelName : schemaObj.name,
    schemaObj.schema,
  );
};

MultiDBMongo.prototype.getTenantModel = function (schemaObj) {
  if (schemaObj.isGlobal) {
    return this.getTenantSystemModel(schemaObj);
  } else {
    return this.getTenantMTModel(schemaObj);
  }
};

//#endregion

module.exports = new MultiDBMongo();
