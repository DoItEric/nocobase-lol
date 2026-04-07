/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Context } from '@nocobase/actions';
import { DataSourceOptions, DatabaseDataSource, SequelizeCollectionManager } from '@nocobase/data-source-manager';
import { Sequelize } from 'sequelize';

export class ExternalPostgresDataSource extends DatabaseDataSource {
  declare collectionManager: SequelizeCollectionManager;

  constructor(options: DataSourceOptions) {
    super(options);
    this.introspector = this.createDatabaseIntrospector(this.collectionManager.db);
  }

  createCollectionManager(options?: any) {
    const cmOptions = {
      ...options?.collectionManager,
    };

    if (options?.databaseInstance) {
      cmOptions.database = options.databaseInstance;
    } else {
      const dialectOptions: Record<string, any> = {};
      if (options?.ssl) {
        dialectOptions.ssl = {
          require: true,
          rejectUnauthorized: options.rejectUnauthorized !== false,
        };
      }

      cmOptions.dialect = 'postgres';
      cmOptions.host = options?.host;
      cmOptions.port = options?.port || 5432;
      cmOptions.database = options?.database;
      cmOptions.username = options?.username;
      cmOptions.password = options?.password;
      cmOptions.schema = options?.schema || 'public';
      cmOptions.tablePrefix = options?.tablePrefix || '';
      cmOptions.dialectOptions = dialectOptions;
      cmOptions.logging = false;
    }

    return new SequelizeCollectionManager(cmOptions);
  }

  static async testConnection(options?: any): Promise<boolean> {
    const dialectOptions: Record<string, any> = {};
    if (options?.ssl) {
      dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: options.rejectUnauthorized !== false,
      };
    }

    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: options?.host,
      port: options?.port || 5432,
      database: options?.database,
      username: options?.username,
      password: options?.password,
      dialectOptions,
      logging: false,
    });

    try {
      await sequelize.authenticate();
      return true;
    } finally {
      await sequelize.close();
    }
  }

  async readTables(): Promise<any> {
    const db = this.collectionManager.db;
    const schema = db.options.schema || 'public';

    const tables = await this.introspector.getTables({
      views: await this.getViews(schema),
    });

    const existingCollections = new Set(
      this.collectionManager.getCollections().map((c: any) => c.options.tableName || c.options.name),
    );

    return tables.map((tableName: string) => ({
      name: tableName,
      required: false,
      selected: existingCollections.has(tableName),
    }));
  }

  async loadTables(ctx: Context, tables: string[]): Promise<any> {
    if (!tables || tables.length === 0) {
      return;
    }

    const db = this.collectionManager.db;
    const schema = db.options.schema || 'public';
    const loadedCollections: Record<string, any> = {};

    const existingDataSourceCollections = await ctx.db.getRepository('dataSourcesCollections').find({
      filter: {
        dataSourceKey: this.name,
      },
    });

    const existingDataSourceFields = await ctx.db.getRepository('dataSourcesFields').find({
      filter: {
        dataSourceKey: this.name,
      },
    });

    for (const record of existingDataSourceCollections) {
      loadedCollections[record.get('name')] = {
        ...record.toJSON(),
        fields: [],
      };
    }

    for (const record of existingDataSourceFields) {
      const collectionName = record.get('collectionName');
      if (loadedCollections[collectionName]) {
        loadedCollections[collectionName].fields.push(record.toJSON());
      }
    }

    const views = await this.getViews(schema);
    const viewSet = new Set(views);

    const collections = await Promise.all(
      tables.map(async (tableName) => {
        const tableInfo = { tableName, schema };
        const localOptions = loadedCollections[tableName] || {};
        const collection = await this.introspector.getCollection({
          tableInfo,
          localOptions,
          mergedOptions: {},
        });

        if (viewSet.has(tableName)) {
          collection.view = true;
        }
        collection.introspected = true;

        return collection;
      }),
    );

    const mergedCollections = this.mergeWithLoadedCollections(collections, loadedCollections);

    for (const collectionOptions of mergedCollections) {
      this.collectionManager.defineCollection(collectionOptions);
    }

    this.emitLoadingProgress({ total: tables.length, loaded: tables.length });
  }

  async load(options: any = {}) {
    const db = this.collectionManager.db;
    const schema = db.options.schema || 'public';

    try {
      await db.sequelize.authenticate();
    } catch (e) {
      throw new Error(`Failed to connect to external PostgreSQL: ${e.message}`);
    }

    const localData = options.localData || {};
    const addAllCollections = this.options.addAllCollections;

    const views = await this.getViews(schema);
    const viewSet = new Set(views);

    let tables: string[];

    if (addAllCollections && Object.keys(localData).length === 0) {
      tables = await this.introspector.getTables({ views });
    } else {
      tables = Object.keys(localData);
    }

    if (tables.length === 0) {
      return;
    }

    const total = tables.length;
    let loaded = 0;
    this.emitLoadingProgress({ total, loaded });

    for (const tableName of tables) {
      try {
        const tableInfo = { tableName, schema };
        const localOptions = localData[tableName] || {};
        const collection = await this.introspector.getCollection({
          tableInfo,
          localOptions,
          mergedOptions: {},
        });

        if (viewSet.has(tableName)) {
          collection.view = true;
        }
        collection.introspected = true;

        const merged = this.mergeWithLoadedCollections([collection], localData);
        for (const collectionOptions of merged) {
          this.collectionManager.defineCollection(collectionOptions);
        }
      } catch (e) {
        this.logger?.warn(`Failed to introspect table ${tableName}: ${e.message}`);
      }

      loaded++;
      this.emitLoadingProgress({ total, loaded });
    }
  }

  async close() {
    const db = this.collectionManager?.db;
    if (db) {
      await db.close();
    }
  }

  publicOptions() {
    return {
      host: this.options.host,
      port: this.options.port,
      database: this.options.database,
      schema: this.options.schema || 'public',
    };
  }

  private async getViews(schema: string): Promise<string[]> {
    try {
      const db = this.collectionManager.db;
      const result = await db.sequelize.query(
        `SELECT table_name FROM information_schema.views WHERE table_schema = :schema`,
        {
          type: 'SELECT',
          replacements: { schema },
        },
      );
      return (result as any[]).map((r: any) => r.table_name);
    } catch {
      return [];
    }
  }
}
