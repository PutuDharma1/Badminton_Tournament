"""add home_placeholder and away_placeholder to Match, make team IDs nullable

Revision ID: d7e3f9a2b814
Revises: c4b727a2b86f
Create Date: 2026-03-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd7e3f9a2b814'
down_revision = 'c4b727a2b86f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('Match', schema=None) as batch_op:
        batch_op.alter_column('home_team_id', existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column('away_team_id', existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column('home_placeholder', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('away_placeholder', sa.String(100), nullable=True))


def downgrade():
    with op.batch_alter_table('Match', schema=None) as batch_op:
        batch_op.drop_column('away_placeholder')
        batch_op.drop_column('home_placeholder')
        batch_op.alter_column('away_team_id', existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column('home_team_id', existing_type=sa.Integer(), nullable=False)
