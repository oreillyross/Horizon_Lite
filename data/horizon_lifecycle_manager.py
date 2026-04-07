"""
Horizon Data Lifecycle Manager (PostgreSQL version)
Automates aging data from HOT → WARM → COLD tiers

Usage:
  python3 horizon_lifecycle_postgres.py

Or add to crontab:
  0 2 * * * /usr/bin/python3 /path/to/horizon_lifecycle_postgres.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
log = logging.getLogger(__name__)


class PostgresLifecycleManager:
    """Manages transitions between HOT, WARM, and COLD data tiers in PostgreSQL."""

    def __init__(self, dbname: str, user: str, password: str, host: str = 'localhost', port: int = 5432):
        """
        Initialize connection to PostgreSQL.

        Args:
            dbname: Database name (e.g., 'horizon')
            user: PostgreSQL user (e.g., 'postgres')
            password: PostgreSQL password
            host: Database host (default: localhost)
            port: Database port (default: 5432)
        """
        self.connection_params = {
            'dbname': dbname,
            'user': user,
            'password': password,
            'host': host,
            'port': port
        }
        self.conn = None
        self.cursor = None

    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(**self.connection_params)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            log.info(f"Connected to PostgreSQL: {self.connection_params['dbname']}")
        except psycopg2.Error as e:
            log.error(f"Failed to connect to PostgreSQL: {e}")
            sys.exit(1)

    def disconnect(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        log.info("Disconnected from PostgreSQL")

    def get_hot_data_size_mb(self) -> float:
        """Estimate current HOT tier size in MB."""
        query = """
            SELECT 
              ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2) as size_mb
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('gdelt_events_hot', 'gdelt_mentions_hot', 'gdelt_gkg_hot', 'signals_hot')
        """
        self.cursor.execute(query)
        result = self.cursor.fetchone()
        return float(result['size_mb'] or 0)

    def get_warm_data_size_mb(self) -> float:
        """Estimate current WARM tier size in MB."""
        query = """
            SELECT 
              ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2) as size_mb
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('gdelt_events_warm', 'gdelt_mentions_warm', 'theme_daily_rollup')
        """
        self.cursor.execute(query)
        result = self.cursor.fetchone()
        return float(result['size_mb'] or 0)

    def get_cold_data_size_mb(self) -> float:
        """Estimate current COLD tier size in MB."""
        query = """
            SELECT 
              ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2) as size_mb
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('scenario_likelihood_archive', 'event_evidence_archive')
        """
        self.cursor.execute(query)
        result = self.cursor.fetchone()
        return float(result['size_mb'] or 0)

    def archive_to_warm(self):
        """Move events older than 30 days from HOT to WARM."""
        log.info("Starting HOT → WARM transition...")

        try:
            # Count events to be archived
            self.cursor.execute("""
                SELECT COUNT(*) as cnt
                FROM gdelt_events_hot
                WHERE event_date < CURRENT_DATE - INTERVAL '30 days'
            """)

            count = self.cursor.fetchone()['cnt']
            log.info(f"Found {count} events older than 30 days")

            if count == 0:
                log.info("No events to archive yet")
                return

            # Call the PostgreSQL function
            self.cursor.execute("SELECT archive_warm_data() AS status, count(1) as rows")
            result = self.cursor.fetchone()

            self.conn.commit()
            log.info(f"✅ HOT → WARM transition complete: {result['status']}")

        except psycopg2.Error as e:
            log.error(f"❌ Failed to archive to WARM: {e}")
            self.conn.rollback()
            raise

    def archive_to_cold(self):
        """Move aggregated data older than 90 days from WARM to COLD."""
        log.info("Starting WARM → COLD transition...")

        try:
            # Count events to be archived
            self.cursor.execute("""
                SELECT COUNT(*) as cnt
                FROM gdelt_events_warm
                WHERE compressed_at < CURRENT_DATE - INTERVAL '90 days'
            """)

            count = self.cursor.fetchone()['cnt']
            log.info(f"Found {count} warm events older than 90 days")

            if count == 0:
                log.info("No warm events to archive yet")
                return

            # Call the PostgreSQL function
            self.cursor.execute("SELECT archive_cold_data() AS status, count(1) as rows")
            result = self.cursor.fetchone()

            self.conn.commit()
            log.info(f"✅ WARM → COLD transition complete: {result['status']}")

        except psycopg2.Error as e:
            log.error(f"❌ Failed to archive to COLD: {e}")
            self.conn.rollback()
            raise

    def maintenance(self):
        """Run VACUUM ANALYZE on all tables."""
        log.info("Starting table maintenance...")

        try:
            self.cursor.execute("SELECT maintenance_tables() AS status")
            result = self.cursor.fetchone()

            self.conn.commit()
            log.info(f"✅ Maintenance complete: {result['status']}")

        except psycopg2.Error as e:
            log.error(f"❌ Failed during maintenance: {e}")
            self.conn.rollback()
            raise

    def generate_storage_report(self):
        """Print storage usage by tier."""
        try:
            hot_mb = self.get_hot_data_size_mb()
            warm_mb = self.get_warm_data_size_mb()
            cold_mb = self.get_cold_data_size_mb()

            total_mb = hot_mb + warm_mb + cold_mb
            total_gb = total_mb / 1024

            log.info("=" * 60)
            log.info("STORAGE REPORT")
            log.info("=" * 60)
            log.info(f"HOT (0-30 days):    {hot_mb:>10.2f} MB")
            log.info(f"WARM (30-90 days):  {warm_mb:>10.2f} MB")
            log.info(f"COLD (90+ days):    {cold_mb:>10.2f} MB")
            log.info(f"{'─' * 60}")
            log.info(f"TOTAL:              {total_mb:>10.2f} MB ({total_gb:.2f} GB)")
            log.info("=" * 60)

        except psycopg2.Error as e:
            log.error(f"Failed to retrieve storage report: {e}")

    def run_daily_maintenance(self):
        """Execute full daily maintenance routine."""
        log.info("Starting daily data lifecycle maintenance...")

        try:
            self.connect()

            self.archive_to_warm()
            self.archive_to_cold()
            self.maintenance()
            self.generate_storage_report()

            log.info("✅ Daily maintenance complete")

        except Exception as e:
            log.error(f"Fatal error during maintenance: {e}")
            sys.exit(1)
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    import os
    from dotenv import load_dotenv

    # Load environment variables from .env if available
    load_dotenv()

    # Get connection parameters from environment or use defaults
    dbname = os.getenv('HORIZON_DB_NAME', 'horizon')
    user = os.getenv('HORIZON_DB_USER', 'postgres')
    password = os.getenv('HORIZON_DB_PASSWORD', 'postgres')
    host = os.getenv('HORIZON_DB_HOST', 'localhost')
    port = int(os.getenv('HORIZON_DB_PORT', '5432'))

    manager = PostgresLifecycleManager(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )

    manager.run_daily_maintenance()


if __name__ == '__main__':
    main()