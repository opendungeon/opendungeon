create unique index idx_friends_sender_recipient
on friends (least(sender_id, recipient_id), greatest(sender_id, recipient_id));
