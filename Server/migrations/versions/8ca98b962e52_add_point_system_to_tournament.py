"""add point_system to tournament

Revision ID: 8ca98b962e52
Revises: d5298d870d6f
Create Date: 2026-04-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8ca98b962e52'
down_revision = 'd5298d870d6f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('Tournament',
        sa.Column('point_system', sa.String(length=20), nullable=True)
    )
    op.execute("UPDATE \"Tournament\" SET point_system = 'RALLY_21' WHERE point_system IS NULL")
    op.alter_column('Tournament', 'point_system', nullable=False)


def downgrade():
    op.drop_column('Tournament', 'point_system')
