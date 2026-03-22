#!/usr/bin/env bash
# Seed 100 mock papers into the Research-Claw literature database.
#
# Distribution:
#   45 unread (inbox), 15 reading (inbox), 25 read (archive), 15 reviewed (archive)
#   ~20 starred (rating=5)
#
# Usage: bash scripts/seed-mock-papers.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="${SCRIPT_DIR}/../.research-claw/library.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

echo "Seeding 100 mock papers into $DB_PATH ..."

sqlite3 "$DB_PATH" <<'EOSQL'
-- Ensure tags exist
INSERT OR IGNORE INTO rc_tags (id, name, color, created_at) VALUES
  ('t-ml', 'machine-learning', '#3B82F6', datetime('now')),
  ('t-nlp', 'NLP', '#8B5CF6', datetime('now')),
  ('t-cv', 'computer-vision', '#F59E0B', datetime('now')),
  ('t-rl', 'reinforcement-learning', '#10B981', datetime('now')),
  ('t-opt', 'optimization', '#EF4444', datetime('now')),
  ('t-gnn', 'graph-neural-network', '#EC4899', datetime('now')),
  ('t-gen', 'generative-model', '#6366F1', datetime('now')),
  ('t-rob', 'robotics', '#14B8A6', datetime('now'));
EOSQL

# Generate SQL for 100 papers
python3 -c "
import uuid, random, json

venues = ['NeurIPS','ICML','ICLR','CVPR','ACL','EMNLP','AAAI','IJCAI','Nature','Science','PNAS','IEEE TPAMI','JMLR','KDD','WWW']
topics = ['Language Understanding','Image Generation','Protein Folding','Graph Reasoning','Code Synthesis','Document Retrieval','Reward Modeling','World Models','Scientific Discovery','Multimodal Alignment','Time Series Forecasting','Drug Discovery','Materials Science','Climate Modeling','Mathematical Reasoning','Symbolic Regression','Causal Inference','Anomaly Detection','Speech Recognition','Video Understanding']
methods = ['Transformer Networks','Diffusion Models','Contrastive Learning','Graph Attention','Reinforcement Learning','Variational Inference','Neural ODE','Mixture of Experts','Sparse Attention','Flow Matching','Energy-Based Models','Meta-Learning','Knowledge Distillation','Prompt Tuning','Constitutional AI']
templates = [
  'A Unified Framework for {t} via {m}',
  'Scaling Laws for {t} in Large-Scale Systems',
  'On the Convergence of {m} for {t}',
  '{m}: A Novel Approach to {t}',
  'Efficient {t} with {m}',
  'Self-Supervised {t} using {m}',
  'Towards Robust {t}: A {m} Perspective',
  'Rethinking {t} through {m}',
  'Learning {t} Representations via {m}',
  'Can {m} Solve {t}? An Empirical Study',
  'Improved {t} with Large-Scale {m}',
  'Beyond {m}: New Paradigms for {t}',
  'Federated {m} for Distributed {t}',
  'Multi-Modal {t} via Cross-Attention {m}',
  'Zero-Shot {t} with Pre-trained {m}',
]
authors_pool = ['Wei Zhang','Yann LeCun','Fei-Fei Li','Yoshua Bengio','Kaiming He','Ilya Sutskever','Percy Liang','Jure Leskovec','Sergey Levine','Chelsea Finn','Daphne Koller','Michael Jordan','Geoffrey Hinton','Demis Hassabis','Pieter Abbeel','Sara Hooker','Timnit Gebru','Emily Bender','Dawn Song','Tengyu Ma','Sanjeev Arora','Sham Kakade','Jason Wei','Tri Dao','Albert Gu','Yujia Li','David Silver']
tag_ids = ['t-ml','t-nlp','t-cv','t-rl','t-opt','t-gnn','t-gen','t-rob']

random.seed(42)

paper_sqls = []
tag_sqls = []

for i in range(100):
    pid = str(uuid.uuid4())
    t = random.choice(topics)
    m = random.choice(methods)
    title = templates[i % len(templates)].replace('{t}', t).replace('{m}', m).replace(\"'\", \"''\")
    auths = random.sample(authors_pool, random.randint(2, 5))
    abstract = f'This paper studies {t.lower()} using {m.lower()}. We achieve state-of-the-art results.'.replace(\"'\", \"''\")
    year = 2018 + random.randint(0, 7)
    venue = random.choice(venues)
    arxiv = f'{2100+i}.{10000+i}'
    doi = f'10.{5000+i}/mock-{i}'

    if i < 45: status = 'unread'
    elif i < 60: status = 'reading'
    elif i < 85: status = 'read'
    else: status = 'reviewed'

    rating = 5 if i % 5 == 0 else 'NULL'

    paper_sqls.append(
        f\"\"\"INSERT INTO rc_papers (id, title, authors, abstract, doi, url, arxiv_id, pdf_path, source, source_id, venue, year, added_at, updated_at, read_status, rating, notes, bibtex_key, metadata)
VALUES ('{pid}', '{title}', '{json.dumps(auths).replace(chr(39), chr(39)+chr(39))}', '{abstract}', '{doi}', 'https://arxiv.org/abs/{arxiv}', '{arxiv}', NULL, 'arxiv', '{arxiv}', '{venue}', {year}, datetime('now', '-{i} hours'), datetime('now', '-{i} hours'), '{status}', {rating}, NULL, NULL, '{{}}');\"\"\"
    )

    # 1-3 random tags per paper
    for tid in random.sample(tag_ids, random.randint(1, 3)):
        tag_sqls.append(f\"INSERT OR IGNORE INTO rc_paper_tags (paper_id, tag_id) VALUES ('{pid}', '{tid}');\")

print('BEGIN TRANSACTION;')
for s in paper_sqls:
    print(s)
for s in tag_sqls:
    print(s)
print('COMMIT;')
" | sqlite3 "$DB_PATH"

# Rebuild FTS index
sqlite3 "$DB_PATH" "INSERT INTO rc_papers_fts(rc_papers_fts) VALUES('rebuild');" 2>/dev/null || echo "(FTS rebuild skipped)"

# Show stats
echo ""
echo "Done! Paper distribution:"
sqlite3 "$DB_PATH" "SELECT read_status, COUNT(*) as cnt FROM rc_papers WHERE metadata IS NULL OR json_extract(metadata, '$.deleted_at') IS NULL GROUP BY read_status;"
echo ""
echo "Starred:"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM rc_papers WHERE rating > 0 AND (metadata IS NULL OR json_extract(metadata, '$.deleted_at') IS NULL);"
echo ""
echo "Total:"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM rc_papers WHERE metadata IS NULL OR json_extract(metadata, '$.deleted_at') IS NULL;"
