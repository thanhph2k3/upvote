export class HealthController {
  constructor(database) {
    this.database = database;
  }

  getStatus = (_req, res) => {
    res.json({
      status: 'ok',
      service: 'upvote-api',
      timestamp: new Date().toISOString(),
    });
  };

  getDatabaseStatus = async (_req, res, next) => {
    try {
      const result = await this.database.query('SELECT current_database() AS database, version() AS version');

      res.json({
        status: 'ok',
        database: result.rows[0].database,
        version: result.rows[0].version,
      });
    } catch (error) {
      next(error);
    }
  };
}
