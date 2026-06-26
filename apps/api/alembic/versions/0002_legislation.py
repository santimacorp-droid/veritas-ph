"""
apps/api/alembic/versions/0002_legislation.py

Add legislation and controversies tracking module.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # laws
    op.create_table(
        "laws",
        sa.Column(
            "law_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("short_title", sa.Text),
        sa.Column("description", sa.Text),
        sa.Column("date_passed", sa.Date),
        sa.Column("status", sa.Text, server_default="'active'"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.execute("CREATE INDEX idx_laws_title_trgm ON laws USING gin (title gin_trgm_ops)")

    # law_provisions
    op.create_table(
        "law_provisions",
        sa.Column(
            "provision_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "law_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("laws.law_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section_number", sa.Text, nullable=False),
        sa.Column("title", sa.Text),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # law_controversies
    op.create_table(
        "law_controversies",
        sa.Column(
            "controversy_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "provision_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("law_provisions.provision_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("issue_description", sa.Text, nullable=False),
        sa.Column("impact", sa.Text),
        sa.Column("severity", sa.Text, nullable=False, server_default="'medium'"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # law_revisions
    op.create_table(
        "law_revisions",
        sa.Column(
            "revision_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "law_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("laws.law_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("proposed_bill", sa.Text, nullable=False),
        sa.Column("proposed_changes", sa.Text, nullable=False),
        sa.Column("sponsor", sa.Text),
        sa.Column("status", sa.Text, server_default="'pending'"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # law_case_links
    op.create_table(
        "law_case_links",
        sa.Column(
            "link_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "controversy_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("law_controversies.controversy_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procurement_cases.case_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("law_case_links")
    op.drop_table("law_revisions")
    op.drop_table("law_controversies")
    op.drop_table("law_provisions")
    op.drop_table("laws")
